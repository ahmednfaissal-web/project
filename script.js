document.addEventListener('DOMContentLoaded', () => {
    // --- Global Elements ---
    const modal = document.getElementById('login-modal');
    const subModal = document.getElementById('subscribe-modal');
    const mainContent = document.getElementById('main-content'); // Container

    const btnModalLogin = document.getElementById('modal-login-btn');
    const btnModalSubscribe = document.getElementById('modal-subscribe-btn');
    const btnCloseSub = document.getElementById('modal-close-sub-btn');

    const btnNavLogin = document.getElementById('btn-login-nav');
    // const btnNavSubscribe = document.getElementById('btn-subscribe-nav'); // Not in HTML currently?
    const btnNavLogout = document.getElementById('btn-logout-nav');
    const btnNavOrganizer = document.getElementById('btn-organizer-nav');
    const btnNavPay = document.getElementById('btn-pay-nav');
    const btnNavNotification = document.getElementById('btn-notification-nav');

    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    // --- State ---
    let isOrganizer = !!localStorage.getItem('organizerName');
    let currentStudentCode = localStorage.getItem('studentCode') || ''; // Store the searched code to reload if needed

    // --- Auth Logic ---
    function updateAuthState() {
        const isLoggedIn = localStorage.getItem('isAuth') === 'true';

        if (!isLoggedIn) {
            // NOT LOGGED IN
            modal.classList.remove('hidden');
            mainContent.classList.add('hidden'); // Logic to hide content wrapper if needed, but SPA views might just be empty?
            // Actually, we probably want to hide the *view content* or show a "Please login" view.
            // Existing logic: hides #main-content.
            mainContent.style.display = 'none';

            btnNavLogin.classList.remove('hidden');
            if (btnNavOrganizer) btnNavOrganizer.classList.remove('hidden');
            if (btnNavPay) btnNavPay.classList.add('hidden');
            if (btnNavNotification) btnNavNotification.classList.add('hidden');
            btnNavLogout.classList.add('hidden');
        } else {
            // LOGGED IN
            modal.classList.add('hidden');
            if (subModal) subModal.classList.add('hidden');
            mainContent.style.display = 'block'; // Show content

            btnNavLogin.classList.add('hidden');
            if (btnNavOrganizer) btnNavOrganizer.classList.remove('hidden');

            // Pay button only for Students (not organizers)
            if (btnNavPay) {
                if (isOrganizer) {
                    btnNavPay.classList.add('hidden');
                } else {
                    btnNavPay.classList.remove('hidden');
                }
            }

            btnNavLogout.classList.remove('hidden');

            // Notification button for Students and Organizer Ahmed
            if (btnNavNotification) {
                const organizerName = localStorage.getItem('organizerName');
                // Show for organizer Ahmed OR for students (non-organizers)
                if (organizerName === 'Ahmed' || !isOrganizer) {
                    btnNavNotification.classList.remove('hidden');
                } else {
                    btnNavNotification.classList.add('hidden');
                }
            }
        }
    }

    // Initial Auth Check
    updateAuthState();


    // Event: Pay Button (Global)
    if (btnNavPay) {
        btnNavPay.addEventListener('click', async () => {
            if (!currentStudentCode) {
                alert("Student code not found. Please log in again.");
                return;
            }

            try {
                // First, check if student already has a pending notification
                const checkResponse = await fetch('/api/get-notifications');
                if (checkResponse.ok) {
                    const allNotifications = await checkResponse.json();

                    // Check if this student has any pending (unresponded) notifications
                    const hasPendingNotification = allNotifications.some(n =>
                        n.studentCode === currentStudentCode && !n.response
                    );

                    if (hasPendingNotification) {
                        alert('⚠️ You already have a pending payment request. Please wait for the organizer to respond.');
                        return;
                    }
                }

                // If no pending notification, proceed to send
                const response = await fetch('/api/pay-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentCode: currentStudentCode,
                        message: "Student wants to pay."
                    })
                });

                if (response.ok) {
                    alert('✅ Notification sent to Organizer!');
                } else {
                    alert('❌ Failed to send notification.');
                }
            } catch (error) {
                console.error('Error sending notification:', error);
                alert('❌ Network error. Failed to send notification.');
            }
        });
    }



    // Event: Notification Button (Global)
    if (btnNavNotification) {
        btnNavNotification.addEventListener('click', async () => {
            const organizerName = localStorage.getItem('organizerName');
            const isStudent = !organizerName; // If no organizer name, it's a student

            try {
                const response = await fetch('/api/get-notifications');
                if (response.ok) {
                    const notifications = await response.json();

                    if (isStudent) {
                        // Filter notifications for this student only
                        const studentNotifications = notifications.filter(n => n.studentCode === currentStudentCode);
                        showStudentNotificationsModal(studentNotifications);
                    } else if (organizerName === 'Ahmed') {
                        // Show all notifications for Ahmed
                        showNotificationsModal(notifications);
                    } else {
                        alert('🚫 Access Denied.');
                    }
                } else {
                    alert('❌ Failed to fetch notifications.');
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
                alert('❌ Network error.');
            }
        });
    }

    // Function to show notifications modal
    function showNotificationsModal(notifications) {
        const modal = document.getElementById('notifications-modal');
        const notificationsList = document.getElementById('notifications-list');

        if (!modal || !notificationsList) return;

        // Filter to show only pending (unresponded) notifications
        const pendingNotifications = notifications.filter(n => !n.response);

        if (pendingNotifications.length === 0) {
            notificationsList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #999;">
                    <p style="font-size: 3rem; margin: 0;">✅</p>
                    <p style="margin-top: 1rem;">All notifications have been responded to!</p>
                    <p style="font-size: 0.9rem; color: #666;">No pending payment requests</p>
                </div>
            `;
        } else {
            // Reverse to show newest first
            const reversedNotifications = [...pendingNotifications].reverse();
            const organizerName = localStorage.getItem('organizerName');

            notificationsList.innerHTML = reversedNotifications.map((n, index) => {
                const hasResponse = n.response && n.response.hours && n.response.price;
                const responseHTML = hasResponse ? `
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: #e8f5e9; border-left: 3px solid #28a745; border-radius: 4px;">
                        <p style="margin: 0; font-size: 0.9rem; color: #2e7d32;">
                            ✅ <strong>Response:</strong> ${n.response.hours} hours × $${n.response.price}/hour = <strong>$${n.response.total}</strong>
                        </p>
                    </div>
                ` : '';

                // Find the original index in the full notifications array
                const originalIndex = notifications.findIndex(notification =>
                    notification.studentCode === n.studentCode &&
                    notification.timestamp === n.timestamp
                );

                const respondButton = organizerName === 'Ahmed' && !hasResponse ? `
                    <button class="btn btn-modal-action respond-notification-btn" data-notification-index="${originalIndex}" data-student-code="${n.studentCode}"
                        style="background: #ffc107; border-color: #ffc107; color: #000; padding: 0.5rem 1rem; white-space: nowrap; margin-left: 0.5rem;">
                        Respond
                    </button>
                ` : '';

                return `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9f9f9;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div style="flex: 1;">
                                <p style="margin: 0; font-weight: bold; color: #333;">💳 Student ${n.studentCode} wants to pay</p>
                                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #666;">⏰ ${n.timestamp}</p>
                                ${responseHTML}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-modal-action review-notification-btn" data-student-code="${n.studentCode}" 
                                    style="background: #17a2b8; border-color: #17a2b8; padding: 0.5rem 1rem; white-space: nowrap;">
                                    Review
                                </button>
                                ${respondButton}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners to Review buttons
            document.querySelectorAll('.review-notification-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const studentCode = e.target.getAttribute('data-student-code');
                    reviewStudent(studentCode);
                });
            });

            // Add event listeners to Respond buttons
            document.querySelectorAll('.respond-notification-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const studentCode = e.target.getAttribute('data-student-code');
                    const notificationIndex = parseInt(e.target.getAttribute('data-notification-index'));
                    showResponseModal(studentCode, notificationIndex);
                });
            });
        }

        modal.classList.remove('hidden');
    }

    // Function to review a student
    function reviewStudent(studentCode) {
        // Close notifications modal
        const modal = document.getElementById('notifications-modal');
        if (modal) modal.classList.add('hidden');

        // Store the student code
        currentStudentCode = studentCode;
        localStorage.setItem('studentCode', studentCode);

        // Navigate to Student Data page
        renderPage('about');

        // Wait for page to render, then search for the student
        setTimeout(() => {
            const searchInput = document.getElementById('student-search');
            if (searchInput) {
                searchInput.value = studentCode;
            }
            searchStudent(studentCode);
        }, 100);
    }

    // Function to show notifications modal for students
    function showStudentNotificationsModal(notifications) {
        const modal = document.getElementById('notifications-modal');
        const notificationsList = document.getElementById('notifications-list');

        if (!modal || !notificationsList) return;

        if (notifications.length === 0) {
            notificationsList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #999;">
                    <p style="font-size: 3rem; margin: 0;">📭</p>
                    <p style="margin-top: 1rem;">No payment requests yet</p>
                    <p style="font-size: 0.9rem; color: #666;">Click "Pay Now" to send a payment request</p>
                </div>
            `;
        } else {
            // Reverse to show newest first
            const reversedNotifications = [...notifications].reverse();

            notificationsList.innerHTML = reversedNotifications.map((n, index) => {
                const hasResponse = n.response && n.response.hours && n.response.price;
                const isPaid = n.paid === true;

                let statusHTML;
                if (isPaid) {
                    // Paid status
                    statusHTML = `
                        <div style="margin-top: 1rem; padding: 1rem; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                            <p style="margin: 0; font-weight: bold; color: #155724;">✅ Payment Confirmed!</p>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #155724;">
                                You paid: <strong>$${n.response.total}</strong> (${n.response.hours} hours × $${n.response.price}/hour)
                            </p>
                        </div>
                    `;
                } else if (hasResponse) {
                    // Has response but not paid yet
                    const originalIndex = notifications.findIndex(notification =>
                        notification.studentCode === n.studentCode &&
                        notification.timestamp === n.timestamp
                    );

                    statusHTML = `
                        <div style="margin-top: 1rem; padding: 1rem; background: #e8f5e9; border-left: 4px solid #28a745; border-radius: 4px;">
                            <p style="margin: 0 0 0.5rem 0; font-weight: bold; color: #2e7d32;">✅ Organizer Response:</p>
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; font-size: 0.95rem; color: #2e7d32;">
                                <span style="font-weight: bold;">Hours:</span>
                                <span>${n.response.hours}</span>
                                <span style="font-weight: bold;">Price/Hour:</span>
                                <span>$${n.response.price}</span>
                                <span style="font-weight: bold;">Total:</span>
                                <span style="font-size: 1.1rem; font-weight: bold;">$${n.response.total}</span>
                            </div>
                            <button class="btn btn-modal-action pay-notification-btn" data-notification-index="${originalIndex}"
                                style="margin-top: 1rem; width: 100%; background: #28a745; border-color: #28a745; color: white; padding: 0.75rem; font-weight: bold; font-size: 1rem;">
                                💳 Confirm Payment
                            </button>
                        </div>
                    `;
                } else {
                    // Waiting for response
                    statusHTML = `
                        <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #856404;">⏳ Waiting for organizer response...</p>
                        </div>
                    `;
                }

                return `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9f9f9;">
                        <div style="margin-bottom: 0.5rem;">
                            <p style="margin: 0; font-weight: bold; color: #333;">💳 Payment Request</p>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #666;">⏰ Sent: ${n.timestamp}</p>
                        </div>
                        ${statusHTML}
                    </div>
                `;
            }).join('');

            // Add event listeners to Pay buttons
            document.querySelectorAll('.pay-notification-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const notificationIndex = parseInt(e.target.getAttribute('data-notification-index'));

                    if (confirm('Confirm that you have completed the payment?')) {
                        try {
                            const response = await fetch('/api/confirm-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    notificationIndex: notificationIndex
                                })
                            });

                            if (response.ok) {
                                alert('✅ Payment confirmed!');

                                // Refresh notifications
                                const notificationsResponse = await fetch('/api/get-notifications');
                                if (notificationsResponse.ok) {
                                    const allNotifications = await notificationsResponse.json();
                                    const studentNotifications = allNotifications.filter(n => n.studentCode === currentStudentCode);
                                    showStudentNotificationsModal(studentNotifications);
                                }
                            } else {
                                alert('❌ Failed to confirm payment.');
                            }
                        } catch (error) {
                            console.error('Error confirming payment:', error);
                            alert('❌ Network error. Failed to confirm payment.');
                        }
                    }
                });
            });
        }

        modal.classList.remove('hidden');
    }

    // Close notifications modal button
    const closeNotificationsBtn = document.getElementById('close-notifications-modal');
    if (closeNotificationsBtn) {
        closeNotificationsBtn.addEventListener('click', () => {
            const modal = document.getElementById('notifications-modal');
            if (modal) modal.classList.add('hidden');
        });
    }

    // Response Modal Handlers
    let currentResponseNotificationIndex = null;

    function showResponseModal(studentCode, notificationIndex) {
        const modal = document.getElementById('response-modal');
        const studentCodeEl = document.getElementById('response-student-code');
        const hoursInput = document.getElementById('response-hours');
        const priceInput = document.getElementById('response-price');
        const totalEl = document.getElementById('response-total');

        if (!modal) return;

        currentResponseNotificationIndex = notificationIndex;
        studentCodeEl.textContent = studentCode;
        hoursInput.value = '';
        priceInput.value = '';
        totalEl.textContent = '0.00';

        modal.classList.remove('hidden');

        // Calculate total when inputs change
        const calculateTotal = () => {
            const hours = parseFloat(hoursInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const total = (hours * price).toFixed(2);
            totalEl.textContent = total;
        };

        hoursInput.addEventListener('input', calculateTotal);
        priceInput.addEventListener('input', calculateTotal);
    }

    // Close response modal
    const closeResponseBtn = document.getElementById('close-response-modal');
    const cancelResponseBtn = document.getElementById('cancel-response-btn');

    if (closeResponseBtn) {
        closeResponseBtn.addEventListener('click', () => {
            const modal = document.getElementById('response-modal');
            if (modal) modal.classList.add('hidden');
        });
    }

    if (cancelResponseBtn) {
        cancelResponseBtn.addEventListener('click', () => {
            const modal = document.getElementById('response-modal');
            if (modal) modal.classList.add('hidden');
        });
    }

    // Submit response
    const submitResponseBtn = document.getElementById('submit-response-btn');
    if (submitResponseBtn) {
        submitResponseBtn.addEventListener('click', async () => {
            const studentCode = document.getElementById('response-student-code').textContent;
            const hours = parseFloat(document.getElementById('response-hours').value);
            const price = parseFloat(document.getElementById('response-price').value);

            if (!hours || hours <= 0) {
                alert('Please enter a valid number of hours.');
                return;
            }

            if (!price || price <= 0) {
                alert('Please enter a valid price per hour.');
                return;
            }

            const total = (hours * price).toFixed(2);

            console.log('Sending response:', {
                notificationIndex: currentResponseNotificationIndex,
                hours: hours,
                price: price,
                total: total
            });

            try {
                const response = await fetch('/api/respond-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notificationIndex: currentResponseNotificationIndex,
                        response: {
                            hours: hours,
                            price: price,
                            total: total
                        }
                    })
                });

                if (response.ok) {
                    alert(`✅ Response sent! Total: $${total}`);

                    // Close response modal
                    const responseModal = document.getElementById('response-modal');
                    if (responseModal) responseModal.classList.add('hidden');

                    // Refresh notifications
                    const notificationsResponse = await fetch('/api/get-notifications');
                    if (notificationsResponse.ok) {
                        const notifications = await notificationsResponse.json();
                        showNotificationsModal(notifications);
                    }
                } else {
                    const errorText = await response.text();
                    console.error('Server error:', response.status, errorText);
                    alert(`❌ Failed to send response. Error: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error('Error sending response:', error);
                alert('❌ Network error. Failed to send response.');
            }
        });
    }


    // --- Navigation Logic (SPA) ---
    const navLinks = document.querySelectorAll('a[data-page]');

    // Handle Navigation Clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            renderPage(page);

            // Mobile Menu Close
            if (mobileMenu && mobileMenu.style.display === 'block') {
                mobileMenu.style.display = 'none';
            }
        });
    });

    // Render Page Function
    function renderPage(pageName) {
        // Simple routing
        let templateId = '';
        switch (pageName) {
            case 'home':
                templateId = 'home-template';
                break;
            case 'contact':
                templateId = 'contact-template';
                break;
            case 'about':
                templateId = 'about-template';
                break;
            default:
                templateId = 'home-template';
        }

        const template = document.getElementById(templateId);
        if (!template) {
            console.error(`Template ${templateId} not found`);
            return;
        }

        // Clear current content
        mainContent.innerHTML = '';

        // Clone and append
        const clone = template.content.cloneNode(true);
        mainContent.appendChild(clone);

        // Initialize Page Specific Logic
        if (pageName === 'about') {
            initAboutPage();
        }
    }

    // Load Default Page (Home)
    renderPage('home');


    // --- GPA Calculator Utilities ---

    // Grade to GPA conversion map
    const gradeToGPA = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0,
        'F': 0.0
    };

    // Student courses storage (keyed by student code)
    let studentCourses = JSON.parse(localStorage.getItem('studentCourses')) || {};
    let editingCourseId = null; // Track which course is being edited

    // Calculate GPA for a student
    function calculateGPA(studentCode) {
        const courses = studentCourses[studentCode] || [];

        if (courses.length === 0) {
            return 0.00;
        }

        let totalPoints = 0;
        let totalCredits = 0;

        courses.forEach(course => {
            const gradePoints = gradeToGPA[course.grade];
            const credits = parseFloat(course.credits);

            // Only include courses with valid grades and credits
            if (gradePoints !== undefined && !isNaN(credits) && credits > 0) {
                totalPoints += gradePoints * credits;
                totalCredits += credits;
            }
        });

        // Handle edge case: no valid courses
        if (totalCredits === 0) {
            return 0.00;
        }

        return (totalPoints / totalCredits).toFixed(2);
    }

    // Save courses to localStorage
    function saveCourses() {
        localStorage.setItem('studentCourses', JSON.stringify(studentCourses));
    }

    // Render courses list
    function renderCourses(studentCode) {
        const coursesList = document.getElementById('courses-list');
        const gpaValue = document.getElementById('gpa-value');

        if (!coursesList || !gpaValue) return;

        const courses = studentCourses[studentCode] || [];

        // Update GPA
        gpaValue.textContent = calculateGPA(studentCode);

        // Clear list
        coursesList.innerHTML = '';

        if (courses.length === 0) {
            coursesList.innerHTML = `
                <div class="no-courses-message">
                    <p style="color: #999; text-align: center; padding: 2rem;">No courses added yet. Organizer can add courses.</p>
                </div>
            `;
            return;
        }

        // Render each course
        courses.forEach((course, index) => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <div class="course-info">
                    <div class="course-name">${course.name}</div>
                    <div class="course-details">
                        <div class="course-detail-item">
                            <span class="course-detail-label">Credits:</span>
                            <span>${course.credits}</span>
                        </div>
                        <div class="course-detail-item">
                            <span class="course-detail-label">Grade:</span>
                            <span class="course-grade">${course.grade}</span>
                        </div>
                    </div>
                </div>
                <div class="course-actions" style="display: ${isOrganizer ? 'flex' : 'none'}">
                    <button class="btn btn-edit-course" data-index="${index}">Edit</button>
                    <button class="btn btn-delete-course" data-index="${index}">Delete</button>
                </div>
            `;
            coursesList.appendChild(courseCard);
        });

        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.btn-edit-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                editCourse(studentCode, index);
            });
        });

        document.querySelectorAll('.btn-delete-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                deleteCourse(studentCode, index);
            });
        });
    }

    // Save courses from table to localStorage
    function saveCoursesFromTable(studentCode) {
        if (!studentCode) return;

        const table = document.getElementById('courses-table');
        if (!table) return;

        const courses = [];
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const codeInput = row.querySelector('.course-code-input');
            const nameInput = row.querySelector('.course-name-input');
            const gradeSelect = row.querySelector('.course-grade-select');

            courses.push({
                code: codeInput.value.trim() || '',
                name: nameInput.value.trim() || '',
                grade: gradeSelect.value || ''
            });
        });

        studentCourses[studentCode] = courses;
        localStorage.setItem('studentCourses', JSON.stringify(studentCourses));
    }

    // Load courses from localStorage into table
    function loadCoursesIntoTable(studentCode) {
        if (!studentCode) return;

        const table = document.getElementById('courses-table');
        if (!table) return;

        const courses = studentCourses[studentCode] || [];
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach((row, index) => {
            const codeInput = row.querySelector('.course-code-input');
            const nameInput = row.querySelector('.course-name-input');
            const gradeSelect = row.querySelector('.course-grade-select');

            if (courses[index]) {
                codeInput.value = courses[index].code || '';
                nameInput.value = courses[index].name || '';
                gradeSelect.value = courses[index].grade || '';
            } else {
                codeInput.value = '';
                nameInput.value = '';
                gradeSelect.value = '';
            }
        });

        // Update GPA after loading
        updateGPADisplay(studentCode);
    }

    // Calculate and update GPA display
    function updateGPADisplay(studentCode) {
        if (!studentCode) {
            const codeEl = document.getElementById('val-code');
            studentCode = codeEl ? codeEl.innerText.trim() : '';
        }

        const gpaValue = document.getElementById('gpa-value');
        if (!gpaValue) return;

        const table = document.getElementById('courses-table');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        let totalPoints = 0;
        let totalCourses = 0;

        rows.forEach(row => {
            const gradeSelect = row.querySelector('.course-grade-select');
            const grade = gradeSelect.value;

            if (grade && gradeToGPA[grade] !== undefined) {
                totalPoints += gradeToGPA[grade];
                totalCourses++;
            }
        });

        const gpa = totalCourses > 0 ? (totalPoints / totalCourses).toFixed(2) : '0.00';
        gpaValue.textContent = gpa;
    }

    // Enable/disable table editing based on organizer status
    function setTableEditable(editable) {
        const table = document.getElementById('courses-table');
        if (!table) return;

        const nameInputs = table.querySelectorAll('.course-name-input');
        const codeInputs = table.querySelectorAll('.course-code-input');
        const gradeSelects = table.querySelectorAll('.course-grade-select');

        if (editable) {
            table.classList.add('editable');
            nameInputs.forEach(input => input.removeAttribute('readonly'));
            codeInputs.forEach(input => input.removeAttribute('readonly'));
            gradeSelects.forEach(select => select.removeAttribute('disabled'));
        } else {
            table.classList.remove('editable');
            nameInputs.forEach(input => input.setAttribute('readonly', 'readonly'));
            codeInputs.forEach(input => input.setAttribute('readonly', 'readonly'));
            gradeSelects.forEach(select => select.setAttribute('disabled', 'disabled'));
        }
    }

    // Setup table change listeners for auto-save and GPA calculation
    function setupTableListeners(studentCode) {
        const table = document.getElementById('courses-table');
        if (!table) return;

        const inputs = table.querySelectorAll('.course-name-input, .course-code-input');
        const selects = table.querySelectorAll('.course-grade-select');

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                saveCoursesFromTable(studentCode);
                updateGPADisplay(studentCode);
            });
        });

        selects.forEach(select => {
            select.addEventListener('change', () => {
                saveCoursesFromTable(studentCode);
                updateGPADisplay(studentCode);
            });
        });
    }

    // Sync management table to display table (one-way: management -> display)
    function syncManagementToDisplay() {
        const mgmtTable = document.getElementById('courses-management-table');
        const displayTable = document.getElementById('courses-table');

        if (!mgmtTable || !displayTable) return;

        const mgmtRows = mgmtTable.querySelectorAll('tbody tr');
        const displayRows = displayTable.querySelectorAll('tbody tr');

        mgmtRows.forEach((mgmtRow, index) => {
            if (displayRows[index]) {
                const mgmtName = mgmtRow.querySelector('.course-mgmt-name').value;
                const mgmtCredits = mgmtRow.querySelector('.course-mgmt-credits').value;
                const mgmtGrade = mgmtRow.querySelector('.course-mgmt-grade').value;

                const displayName = displayRows[index].querySelector('.course-name-input');
                const displayCredits = displayRows[index].querySelector('.course-credits-input');
                const displayGrade = displayRows[index].querySelector('.course-grade-select');

                displayName.value = mgmtName;
                displayCredits.value = mgmtCredits;
                displayGrade.value = mgmtGrade;
            }
        });

        // Update GPA after sync
        updateGPADisplay();
    }

    // Load courses into management table
    function loadCoursesIntoManagementTable(studentCode) {
        if (!studentCode) return;

        const mgmtTable = document.getElementById('courses-management-table');
        if (!mgmtTable) return;

        const courses = studentCourses[studentCode] || [];
        const rows = mgmtTable.querySelectorAll('tbody tr');

        rows.forEach((row, index) => {
            const nameInput = row.querySelector('.course-mgmt-name');
            const creditsInput = row.querySelector('.course-mgmt-credits');
            const gradeSelect = row.querySelector('.course-mgmt-grade');

            if (courses[index]) {
                nameInput.value = courses[index].name || '';
                creditsInput.value = courses[index].credits || '';
                gradeSelect.value = courses[index].grade || '';
            } else {
                nameInput.value = '';
                creditsInput.value = '';
                gradeSelect.value = '';
            }
        });
    }

    // Setup management table listeners
    function setupManagementTableListeners(studentCode) {
        const mgmtTable = document.getElementById('courses-management-table');
        if (!mgmtTable) return;

        const inputs = mgmtTable.querySelectorAll('.course-mgmt-name, .course-mgmt-credits');
        const selects = mgmtTable.querySelectorAll('.course-mgmt-grade');

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateGPAFromManagementTable();
                saveCoursesFromManagementTable(studentCode);
            });
        });

        selects.forEach(select => {
            select.addEventListener('change', () => {
                updateGPAFromManagementTable();
                saveCoursesFromManagementTable(studentCode);
            });
        });
    }

    // Save courses from management table to localStorage
    function saveCoursesFromManagementTable(studentCode) {
        if (!studentCode) return;

        const mgmtTable = document.getElementById('courses-management-table');
        if (!mgmtTable) return;

        const courses = [];
        const rows = mgmtTable.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const nameInput = row.querySelector('.course-mgmt-name');
            const creditsInput = row.querySelector('.course-mgmt-credits');
            const gradeSelect = row.querySelector('.course-mgmt-grade');

            courses.push({
                name: nameInput.value.trim() || '',
                credits: creditsInput.value.trim() || '',
                grade: gradeSelect.value || ''
            });
        });

        studentCourses[studentCode] = courses;
        localStorage.setItem('studentCourses', JSON.stringify(studentCourses));
    }


    // --- View Specific Logic: About / Student ID ---
    function initAboutPage() {
        const btnOrganizerSignIn = document.getElementById('btn-organizer-signin');
        const btnOrganizerLogout = document.getElementById('btn-organizer-logout');
        const organizerControls = document.getElementById('organizer-controls');
        const btnSaveStudent = document.getElementById('btn-save-student');
        const btnSearch = document.getElementById('btn-search');
        const searchInput = document.getElementById('student-search');
        const photoUpload = document.getElementById('photo-upload');
        const btnCreateAccount = document.getElementById('btn-create-student-account');
        const photoArea = document.getElementById('photo-area');

        // Restore Organizer State UI
        toggleOrganizerMode(isOrganizer);

        // Restore Search data if we have it
        if (currentStudentCode && searchInput) {
            searchInput.value = currentStudentCode;
            searchStudent(currentStudentCode);
        }

        // Event: Search
        if (btnSearch) {
            btnSearch.addEventListener('click', () => {
                const code = searchInput.value.trim();
                if (code) {
                    currentStudentCode = code;
                    searchStudent(code);
                } else {
                    alert("Please enter a Student Code.");
                }
            });
        }

        // Event: Organizer Sign In
        if (btnOrganizerSignIn) {
            btnOrganizerSignIn.addEventListener('click', () => {
                const email = prompt("Enter Organizer Email:");
                if (!email) return;
                const password = prompt("Enter Organizer Password:");
                if (!password) return;

                let organizerName = '';
                if (email === "1" && password === "1") {
                    organizerName = "Ahmed";
                } else if (email === "2" && password === "2") {
                    organizerName = "Mohamed";
                }

                if (organizerName) {
                    isOrganizer = true;
                    localStorage.setItem('organizerName', organizerName);
                    toggleOrganizerMode(true);
                    alert(`✅ Organizer Access Granted! Welcome, ${organizerName}!`);
                } else {
                    alert("❌ Access Denied! Incorrect email or password.");
                }
            });
        }

        // Event: Organizer Logout
        if (btnOrganizerLogout) {
            btnOrganizerLogout.addEventListener('click', () => {
                isOrganizer = false;
                toggleOrganizerMode(false);
            });
        }

        // Event: Save Student
        if (btnSaveStudent) {
            btnSaveStudent.addEventListener('click', async () => {
                const codeEl = document.getElementById('val-code');
                const code = codeEl ? codeEl.innerText.trim() : '';

                if (!code) {
                    alert("Student Code is required to save!");
                    return;
                }
                if (!isOrganizer) {
                    alert("🔒 Security Alert: Only Organizers can save changes.");
                    return;
                }

                // Check if organizer is Ahmed (email: "1") - cannot edit
                const organizerName = localStorage.getItem('organizerName');
                if (organizerName === 'Ahmed') {
                    alert("🔒 Access Denied: Organizer with email '1' cannot edit student data.");
                    return;
                }

                // Save courses to localStorage first
                saveCoursesFromTable(code);

                const data = {
                    code: code,
                    name: document.getElementById('val-name').innerText.trim(),
                    nid: document.getElementById('val-nid').innerText.trim(),
                    level: document.getElementById('val-level').innerText.trim(),
                    major: document.getElementById('val-major').innerText.trim(),
                    division: document.getElementById('val-division').innerText.trim(),
                    photo: document.getElementById('student-photo').src || '',
                    courses: studentCourses[code] || [] // Include course grades
                };

                try {
                    const response = await fetch('/api/save-student', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    if (response.ok) alert(result.message);
                    else alert("Error saving: " + result.message);
                } catch (error) {
                    console.error('Error saving student:', error);
                    alert("Failed to connect to server.");
                }
            });
        }

        // Event: Photo Upload
        if (photoUpload) {
            photoUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        const studentPhoto = document.getElementById('student-photo');
                        const photoPlaceholder = document.getElementById('photo-placeholder');
                        studentPhoto.src = event.target.result;
                        studentPhoto.style.display = 'block';
                        if (photoPlaceholder) photoPlaceholder.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Event: Photo Click (Organizer only)
        if (photoArea) {
            photoArea.onclick = () => {
                if (isOrganizer && photoUpload) photoUpload.click();
            };
        }

        // --- GPA Calculator Event Handlers ---
        const btnAddCourse = document.getElementById('btn-add-course');
        const btnSaveCourse = document.getElementById('btn-save-course');
        const btnCancelCourse = document.getElementById('btn-cancel-course');
        const addCourseForm = document.getElementById('add-course-form');

        // Show add course button if organizer
        if (btnAddCourse && isOrganizer) {
            btnAddCourse.style.display = 'block';
        }

        // Event: Add Course Button
        if (btnAddCourse) {
            btnAddCourse.addEventListener('click', () => {
                editingCourseId = null; // Reset editing state
                // Clear form
                document.getElementById('course-name').value = '';
                document.getElementById('course-credits').value = '';
                document.getElementById('course-grade').value = '';
                // Show form
                addCourseForm.classList.remove('hidden');
            });
        }

        // Event: Save Course Button
        if (btnSaveCourse) {
            btnSaveCourse.addEventListener('click', () => {
                const name = document.getElementById('course-name').value.trim();
                const credits = document.getElementById('course-credits').value.trim();
                const grade = document.getElementById('course-grade').value;

                // Validation
                if (!name) {
                    alert('Please enter a course name.');
                    return;
                }
                if (!credits || isNaN(credits) || parseFloat(credits) <= 0) {
                    alert('Please enter valid credit hours (1-6).');
                    return;
                }
                if (!grade) {
                    alert('Please select a grade.');
                    return;
                }

                const courseData = { name, credits: parseFloat(credits), grade };

                // Get current student code
                const codeEl = document.getElementById('val-code');
                const studentCode = codeEl ? codeEl.innerText.trim() : '';

                if (!studentCode) {
                    alert('No student code found. Please search for a student first.');
                    return;
                }

                // Save course
                saveCourse(studentCode, courseData, editingCourseId);

                // Hide form and reset
                addCourseForm.classList.add('hidden');
                editingCourseId = null;
            });
        }

        // Event: Cancel Course Button
        if (btnCancelCourse) {
            btnCancelCourse.addEventListener('click', () => {
                addCourseForm.classList.add('hidden');
                editingCourseId = null;
            });
        }

        // Load courses for current student
        if (currentStudentCode) {
            renderCourses(currentStudentCode);
        }

        // Event: Create Account
        if (btnCreateAccount) {
            btnCreateAccount.addEventListener('click', async () => {
                const email = document.getElementById('new-student-email').value;
                const password = document.getElementById('new-student-password').value;
                const codeEl = document.getElementById('val-code');
                const studentCode = codeEl ? codeEl.innerText.trim() : '';

                if (!email || !password) {
                    alert("Please enter email and password.");
                    return;
                }
                if (!studentCode) {
                    alert("Please ensure a valid Student Code is displayed on the card to link this account.");
                    return;
                }

                try {
                    const response = await fetch('/api/save-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, code: studentCode })
                    });
                    if (response.ok) {
                        alert("Account created and linked to Student Code: " + studentCode);
                        document.getElementById('new-student-email').value = '';
                        document.getElementById('new-student-password').value = '';
                    } else {
                        const err = await response.text();
                        alert("Error: " + err);
                    }
                } catch (error) {
                    console.error(error);
                    alert("Failed to connect to server.");
                }
            });
        }

    }

    // Helper: Search Student
    async function searchStudent(code) {
        try {
            const response = await fetch(`/api/get-student?code=${encodeURIComponent(code)}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.code) {
                    // Populate fields
                    document.getElementById('val-code').innerText = data.code || '';
                    document.getElementById('val-name').innerText = data.name || '';
                    document.getElementById('val-nid').innerText = data.nid || '';
                    document.getElementById('val-level').innerText = data.level || '';
                    document.getElementById('val-major').innerText = data.major || '';
                    document.getElementById('val-division').innerText = data.division || '';

                    // Populate photo
                    const photo = document.getElementById('student-photo');
                    const placeholder = document.getElementById('photo-placeholder');
                    if (data.photo && data.photo.startsWith('data:image')) {
                        photo.src = data.photo;
                        photo.style.display = 'block';
                        if (placeholder) placeholder.style.display = 'none';
                    } else {
                        photo.src = '';
                        photo.style.display = 'none';
                        if (placeholder) placeholder.style.display = 'block';
                    }

                    // Generate QR Code
                    const qrCodeImg = document.getElementById('student-qr-code');
                    if (qrCodeImg) {
                        // Using QR Server API
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.code)}`;
                        qrCodeImg.src = qrUrl;
                        qrCodeImg.style.display = 'block';
                    }

                    // Load courses from server data if available
                    if (data.courses && Array.isArray(data.courses)) {
                        studentCourses[data.code] = data.courses;
                        localStorage.setItem('studentCourses', JSON.stringify(studentCourses));
                    }

                    // Load courses for this student
                    loadCoursesIntoTable(data.code);
                    setupTableListeners(data.code);
                } else {
                    alert("Student not found.");
                }
            } else {
                alert("Error searching.");
            }
        } catch (error) {
            console.error('Error searching student:', error);
            // alert("Failed to connect to server."); // Optional, can be annoying on empty load
        }
    }

    // Helper: Toggle Organizer Mode UI
    function toggleOrganizerMode(enabled) {
        const btnOrganizerSignIn = document.getElementById('btn-organizer-signin');
        const organizerControls = document.getElementById('organizer-controls');
        const searchControls = document.getElementById('search-controls');
        const photoArea = document.getElementById('photo-area');

        // Note: These elements must exist in DOM (so inside initAboutPage called after render)
        if (!btnOrganizerSignIn) return;

        // Check if organizer is "Ahmed" (email: "1") - this organizer cannot edit
        const organizerName = localStorage.getItem('organizerName');
        const isAhmed = organizerName === 'Ahmed'; // Ahmed has email "1" and cannot edit

        if (enabled) {
            btnOrganizerSignIn.classList.add('hidden');
            if (organizerControls) organizerControls.classList.remove('hidden');
            if (searchControls) searchControls.style.display = 'block';

            // Only enable table editing if NOT Ahmed (email "1")
            if (!isAhmed) {
                setTableEditable(true);
            } else {
                setTableEditable(false);
            }
        } else {
            btnOrganizerSignIn.classList.remove('hidden');
            if (organizerControls) organizerControls.classList.add('hidden');
            if (searchControls) searchControls.style.display = 'none';
            // Disable table editing for GPA calculator
            setTableEditable(false);
        }

        // Editable - Only allow editing if enabled AND not Ahmed (email "1")
        const fields = document.querySelectorAll('.info-value');
        fields.forEach(field => {
            field.contentEditable = (enabled && !isAhmed);
        });

        if (photoArea) {
            if (enabled && !isAhmed) {
                photoArea.classList.add('editable');
            } else {
                photoArea.classList.remove('editable');
            }
        }
    }

    // --- Global Helpers (Auth) ---
    async function sendData(email, password) {
        try {
            const response = await fetch('/api/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return true;
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to connect to the server.');
            return false;
        }
    }

    // --- Global Event Listeners (Nav/Modal) ---
    // These elements are always in index.html (header/modals)

    // NAVBAR: Organizer Button (Global, not in template)
    if (btnNavOrganizer) {
        btnNavOrganizer.addEventListener('click', async () => {
            // Handle organizer login at global level or switch to About page?
            // Requirement says: "When 'Author Sign In' ... visible after login".
            // Let's prompt here too, and if success, maybe switch to 'about' page to show controls?
            const email = prompt("Enter Organizer Email:");
            if (!email) return;
            const password = prompt("Enter Organizer Password:");
            if (!password) return;

            let organizerName = '';
            if (email === "1" && password === "1") {
                organizerName = "Ahmed";
            } else if (email === "2" && password === "2") {
                organizerName = "Mohamed";
            }

            if (organizerName) {
                isOrganizer = true;
                localStorage.setItem('isAuth', 'true'); // Ensure logged in
                localStorage.setItem('organizerName', organizerName);
                updateAuthState();

                // Navigate to About page to show controls
                renderPage('about');

                alert(`✅ Organizer Access Granted! Welcome, ${organizerName}!`);
            } else {
                alert("❌ Access Denied! Incorrect email or password.");
            }
        });
    }


    // MODAL: Login Button
    if (btnModalLogin) {
        btnModalLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                alert('Please enter your email and password');
                return;
            }

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('isAuth', 'true');

                    if (data.code) {
                        currentStudentCode = data.code;
                        localStorage.setItem('studentCode', data.code);
                        renderPage('about'); // Go to about page to show ID
                        updateAuthState();
                        // Wait for render to complete then load data (redundant with initAboutPage but safe)
                        setTimeout(() => searchStudent(data.code), 100);
                    } else {
                        updateAuthState();
                    }
                } else {
                    alert("Invalid email or password.");
                }
            } catch (error) {
                console.error(error);
                alert("Failed to connect to server.");
            }
        });
    }

    // Navbar Login (Shows modal)
    if (btnNavLogin) {
        btnNavLogin.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    // Navbar Logout
    if (btnNavLogout) {
        btnNavLogout.addEventListener('click', () => {
            localStorage.removeItem('isAuth');
            localStorage.removeItem('studentCode');
            localStorage.removeItem('organizerName');
            currentStudentCode = '';
            isOrganizer = false;
            updateAuthState(); // This will hide content
            renderPage('home'); // Reset to home? or just stay hidden
            modal.classList.remove('hidden');
        });
    }

    // Hamburger
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const isVisible = mobileMenu.style.display === 'block';
            mobileMenu.style.display = isVisible ? 'none' : 'block';
        });
    }

    // Resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 980 && mobileMenu) {
            mobileMenu.style.display = 'none';
        }
    });

    // Modal Organizer Button
    const btnModalOrganizer = document.getElementById('modal-organizer-btn');
    if (btnModalOrganizer) {
        btnModalOrganizer.addEventListener('click', () => {
            const email = prompt("Enter Organizer Email:");
            if (!email) return;
            const password = prompt("Enter Organizer Password:");
            if (!password) return;

            let organizerName = '';
            if (email === "1" && password === "1") {
                organizerName = "Ahmed";
            } else if (email === "2" && password === "2") {
                organizerName = "Mohamed";
            }

            if (organizerName) {
                isOrganizer = true;
                localStorage.setItem('isAuth', 'true');
                localStorage.setItem('organizerName', organizerName);
                updateAuthState();
                renderPage('about');
                alert(`✅ Organizer Access Granted! Welcome, ${organizerName}!`);
            } else {
                alert("❌ Access Denied! Incorrect email or password.");
            }
        });
    }

});
