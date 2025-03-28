document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem('authToken');

    // Custom Modal Functions
    function showCustomModal(title, message, onConfirm, showCancel = true) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');
        const modalClose = document.querySelector('.modal-close');

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';
        modalCancel.style.display = showCancel ? 'block' : 'none';

        const newConfirmBtn = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);
        document.getElementById('modalConfirm').addEventListener('click', function() {
            onConfirm();
            hideCustomModal();
        });

        if (showCancel) {
            modalCancel.addEventListener('click', hideCustomModal);
        }
        modalClose.addEventListener('click', hideCustomModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) hideCustomModal();
        });
    }

    function hideCustomModal() {
        const modal = document.getElementById('customModal');
        modal.style.display = 'none';
    }

    // Authentication check
    if (!token) {
        showCustomModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }, false
        );
        return;
    }

    // Logout functionality with custom modal
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showCustomModal('Logout Confirmation', 'Are you sure you want to log out?', 
                function() {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userId');
                    window.location.href = '../J-Mab/HTML/sign-in.php';
                }
            );
        });
    }

    // Password visibility toggle
    document.querySelectorAll(".password-container i").forEach(icon => {
        icon.addEventListener("click", function () {
            const passwordInput = this.previousElementSibling; 
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                this.classList.remove("fa-eye");
                this.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                this.classList.remove("fa-eye-slash");
                this.classList.add("fa-eye");
            }
        });
    });

    // Add User functionality
    function addUser(firstName, lastName, email, password, role) {
        if (!firstName || !lastName || !email || !password || !role) {
            showCustomModal('Input Error', 'Please fill in all fields.', function() {}, false);
            return;
        }

        if (password.length < 8) {
            showCustomModal('Invalid Password', 'Password must be at least 8 characters long.', function() {}, false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showCustomModal('Invalid Email', 'Please enter a valid email address.', function() {}, false);
            return;
        }

        const payload = { 
            first_name: firstName, 
            last_name: lastName, 
            email: email, 
            password: password, 
            roles: role
        };
        
        fetch("http://localhost/jmab/final-jmab/api/users/register", {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showCustomModal('Success', 'User added successfully!', function() {
                    fetchUsers();
                    document.getElementById('add-user-form').reset();
                }, false);
            } else {
                showCustomModal('Error', data.errors ? data.errors.join(', ') : 'Unknown error', function() {}, false);
            }
        })
        .catch(error => {
            console.error("Error adding user:", error);
            showCustomModal('Error', 'An error occurred while adding the user.', function() {}, false);
        });
    }

    // Add User Form Event Listener
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function (e) {
            e.preventDefault();
            
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            addUser(firstName, lastName, email, password, role);
        });
    }

    // Fetch Users and Display in Table
    function fetchUsers() {
        fetch("http://localhost/jmab/final-jmab/api/users", {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const adminsTableBody = document.querySelector('#adminsTable');
                const customersTableBody = document.querySelector('#customersTable');

                adminsTableBody.innerHTML = '';
                customersTableBody.innerHTML = '';

                data.users.forEach(user => {
                    const roles = user.roles || '?';
                    const row = `
                        <tr data-id="${user.id}">
                            <td>${user.first_name}</td>
                            <td>${user.last_name}</td>
                            <td>${user.email}</td>
                            <td>${roles}</td>
                            <td>
                                <button class="remove-btn" data-id="${user.id}">Remove User</button>
                            </td>
                        </tr>
                    `;

                    if (roles.toLowerCase() === 'admin') {
                        adminsTableBody.innerHTML += row;
                    } else {
                        customersTableBody.innerHTML += row;
                    }
                });

                document.querySelectorAll('.remove-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const userId = this.getAttribute('data-id');
                        deleteUser(userId);
                    });
                });
            } else {
                showCustomModal('Error', 'Error fetching users: ' + (data.errors ? data.errors.join(', ') : 'Unknown error'), function() {}, false);
            }
        })
        .catch(error => {
            console.error("Error fetching users:", error);
            showCustomModal('Error', 'An error occurred while fetching users: ' + error.message, function() {}, false);
        });
    }

    // Delete User functionality
    function deleteUser(userId) {
        showCustomModal('Delete Confirmation', 'Are you sure you want to delete this user? This action cannot be undone.', 
            function() {
                fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showCustomModal('Success', 'User deleted successfully!', function() {
                            fetchUsers();
                        }, false);
                    } else {
                        showCustomModal('Error', 'Error deleting user: ' + (data.errors ? data.errors.join(', ') : 'Unknown error'), function() {}, false);
                    }
                })
                .catch(error => {
                    console.error("Error deleting user:", error);
                    showCustomModal('Error', 'An error occurred while deleting the user: ' + error.message, function() {}, false);
                });
            }
        );
    }

    // Initial load of users
    fetchUsers();
});