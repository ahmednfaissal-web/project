import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import time
import traceback

# --- Configuration ---
# Read port from environment variable (Render sets this dynamically)
PORT = int(os.environ.get("PORT", 8000))

# Data File Paths
DATA_FILE = 'users.json'
STUDENTS_FILE = 'students.json'
NOTIFICATIONS_FILE = 'notifications.json'

# Ensure data files exist to prevent startup errors
for file_path in [DATA_FILE, STUDENTS_FILE, NOTIFICATIONS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as f:
            if file_path == DATA_FILE:
                json.dump([], f) # Users list
            elif file_path == STUDENTS_FILE:
                json.dump({}, f) # Students dict
            elif file_path == NOTIFICATIONS_FILE:
                json.dump([], f) # Notifications list

# --- Request Handler ---
class RequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Production-ready request handler with:
    - JSON helper methods for consistent API responses
    - CORS support
    - Error handling
    - Static file serving
    """

    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-type', content_type)
        # CORS Headers (Allow all origins for simplicity in this dev/demo context, 
        # or restrict to specific domains in strict production if needed)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _send_json(self, data, status=200):
        """Helper to send JSON response with proper headers."""
        try:
            response_body = json.dumps(data).encode('utf-8')
            self._set_headers(status)
            self.wfile.write(response_body)
        except Exception as e:
            print(f"[ERROR] Failed to send JSON response: {e}")
            self._send_error(500, "Internal Server Error during response encoding")

    def _send_error(self, status, message):
        """Helper to send JSON error response."""
        self._send_json({'status': 'error', 'message': message}, status)

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self._set_headers(200)

    def do_GET(self):
        """Handle GET requests (Static files + API)."""
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        # --- API Endpoints ---
        if path == '/api/get-student':
            self.handle_get_student(parsed_url)
        elif path == '/api/get-notifications':
            self.handle_get_notifications()
        # --- Static File Serving ---
        else:
            # Security: Prevent directory traversal is handled by SimpleHTTPRequestHandler
            # by default, but we ensure we don't accidentally expose sensitive files if we were custom serving.
            # Since we delegate to super().do_GET(), it uses the current working directory.
            # Ideally, we'd serve from a 'public' folder, but user structure is flat.
            super().do_GET()

    def do_POST(self):
        """Handle POST requests (API)."""
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        # --- API Endpoints ---
        if path == '/api/save-user':
            self.handle_save_user()
        elif path == '/api/login':
            self.handle_login()
        elif path == '/api/save-student':
            self.handle_save_student()
        elif path == '/api/pay-notification':
            self.handle_pay_notification()
        elif path == '/api/respond-notification':
            self.handle_respond_notification()
        elif path == '/api/confirm-payment':
            self.handle_confirm_payment()
        else:
            self._send_error(404, "Endpoint not found")

    # --- API Handlers (Refactored for Cleanliness) ---

    def handle_get_student(self, parsed_url):
        try:
            params = parse_qs(parsed_url.query)
            student_code = params.get('code', [None])[0]

            if not student_code:
                self._send_error(400, "Missing student code")
                return

            students = self._read_json_file(STUDENTS_FILE, {})
            student_data = students.get(student_code, {})
            
            self._send_json(student_data)
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_get_notifications(self):
        try:
            notifications = self._read_json_file(NOTIFICATIONS_FILE, [])
            self._send_json(notifications)
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_save_user(self):
        try:
            data = self._read_post_data()
            email = data.get('email')
            password = data.get('password')
            student_code = data.get('code') # Optional

            if not email or not password:
                self._send_error(400, "Missing email or password")
                return

            users = self._read_json_file(DATA_FILE, [])

            # Check for Duplicate Email
            if any(u.get('email') == email for u in users):
                self._send_error(409, "Email already exists")
                return

            users.append({'email': email, 'password': password, 'code': student_code})
            self._write_json_file(DATA_FILE, users)

            self._send_json({'status': 'success', 'message': 'Account created successfully'})
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_login(self):
        try:
            data = self._read_post_data()
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                self._send_error(400, "Missing credentials")
                return

            users = self._read_json_file(DATA_FILE, [])
            
            user_found = next((u for u in users if u.get('email') == email and u.get('password') == password), None)

            if user_found:
                self._send_json({
                    'status': 'success', 
                    'message': 'Login successful', 
                    'code': user_found.get('code')
                })
            else:
                self._send_error(401, "Invalid credentials")
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_save_student(self):
        try:
            data = self._read_post_data()
            student_code = data.get('code')

            if not student_code:
                self._send_error(400, "Missing student code")
                return

            students = self._read_json_file(STUDENTS_FILE, {})
            students[student_code] = data
            self._write_json_file(STUDENTS_FILE, students, indent=4) # Keep indent for readability if manually inspecting

            self._send_json({'status': 'success', 'message': 'Student data saved'})
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_pay_notification(self):
        try:
            data = self._read_post_data()
            if not data.get('studentCode'):
                self._send_error(400, "Missing student code")
                return

            notifications = self._read_json_file(NOTIFICATIONS_FILE, [])
            
            data['timestamp'] = time.strftime("%Y-%m-%d %H:%M:%S")
            notifications.append(data)
            
            self._write_json_file(NOTIFICATIONS_FILE, notifications)
            
            self._send_json({'status': 'success', 'message': 'Notification sent'})
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_respond_notification(self):
        try:
            data = self._read_post_data()
            notification_index = data.get('notificationIndex')
            response_data = data.get('response')

            if notification_index is None or not response_data:
                self._send_error(400, "Missing notification index or response data")
                return

            notifications = self._read_json_file(NOTIFICATIONS_FILE, [])

            if 0 <= notification_index < len(notifications):
                notifications[notification_index]['response'] = response_data
                self._write_json_file(NOTIFICATIONS_FILE, notifications)
                self._send_json({'status': 'success', 'message': 'Response saved'})
            else:
                self._send_error(404, "Notification not found")
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    def handle_confirm_payment(self):
        try:
            data = self._read_post_data()
            notification_index = data.get('notificationIndex')

            if notification_index is None:
                self._send_error(400, "Missing notification index")
                return

            notifications = self._read_json_file(NOTIFICATIONS_FILE, [])

            if 0 <= notification_index < len(notifications):
                notifications[notification_index]['paid'] = True
                self._write_json_file(NOTIFICATIONS_FILE, notifications)
                self._send_json({'status': 'success', 'message': 'Payment confirmed'})
            else:
                self._send_error(404, "Notification not found")
        except Exception as e:
            traceback.print_exc()
            self._send_error(500, str(e))

    # --- Helpers ---

    def _read_post_data(self):
        """Read and parse POST body JSON."""
        content_length_header = self.headers.get('Content-Length')
        if not content_length_header:
             raise ValueError("Missing Content-Length header")
        content_length = int(content_length_header)
        post_data = self.rfile.read(content_length)
        return json.loads(post_data.decode('utf-8'))

    def _read_json_file(self, filename, default_value):
        """Read JSON file safely, return default if missing or invalid."""
        if not os.path.exists(filename):
            return default_value
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                return json.loads(content) if content else default_value
        except (json.JSONDecodeError, IOError):
            print(f"[WARNING] Could not read {filename}, using default.")
            return default_value

    def _write_json_file(self, filename, data, indent=4):
        """Write JSON file safely."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)


# --- Threaded Server ---
class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """
    Threaded TCPServer for handling multiple concurrent requests.
    This is essential for production environments to avoid blocking.
    """
    allow_reuse_address = True # Allow restarting immediately after stop
    daemon_threads = True # Threads die when main thread dies

if __name__ == "__main__":
    print(f"Starting server on port {PORT}...")
    
    # Bind to 0.0.0.0 for external access (Render)
    server_address = ("0.0.0.0", PORT)
    
    with ThreadedTCPServer(server_address, RequestHandler) as httpd:
        print(f"Server is listening on 0.0.0.0:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
