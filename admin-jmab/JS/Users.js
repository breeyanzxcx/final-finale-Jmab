document.addEventListener("DOMContentLoaded", function () {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    // Logout confirmation
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        });
    }

    // Add User functionality
    function addUser(firstName, lastName, email, password, role) {
        if (!firstName || !lastName || !email || !password || !role) {
            alert("Please fill in all fields.");
            return;
        }
    
        if (password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        }
    
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.");
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
        .then(response => {
            console.log('Raw Response:', response);
            return response.json();
        })
        .then(data => {
            console.log('Full API Response:', data);
            console.log('Roles sent:', payload.roles);
            console.log('Role selected:', role);

            if (data.success) {
                alert("User added successfully!");
                fetchUsers(); 
                document.getElementById('add-user-form').reset();
            } else {
                console.error('Registration Failure Details:', {
                    success: data.success,
                    errors: data.errors,
                    payload: payload
                });
                alert((data.errors ? data.errors.join(', ') : 'Unknown error'));
            }
        })
        .catch(error => {
            console.error("Complete Error Details:", {
                error: error,
                errorMessage: error.message,
                errorStack: error.stack
            });
            alert("An error occurred while adding the user.");
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
    
            console.log('Form Submission Role:', role);
            addUser(firstName, lastName, email, password, role);
        });
    }

    // Fetch Users and Display in Table
    function fetchUsers() {
        fetch("http://localhost/jmab/final-jmab/api/users", {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Fixed: Added backticks for template literal
            },
        })
        .then(response => response.json())
        .then(data => {
            console.log('Full API Response:', data);
            if (data.success) {
                const tableBody = document.querySelector('#customers-table tbody');
                if (tableBody) {
                    tableBody.innerHTML = '';
        
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
                        tableBody.innerHTML += row;
                    });
        
                    document.querySelectorAll('.remove-btn').forEach(button => {
                        button.addEventListener('click', function () {
                            const userId = this.getAttribute('data-id');
                            deleteUser(userId);
                        });
                    });
                } else {
                    console.error("Table body element not found");
                }
            } else {
                console.error("Error fetching users:", data.errors);
            }
        })
        .catch(error => console.error("Error fetching users:", error));
    }


    function deleteUser(userId) {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }
    
        fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Delete API Response:', data);
    
            if (data.success) {
                alert("User deleted successfully!");
                fetchUsers(); 
            } else {
                alert("Error deleting user: " + (data.errors ? data.errors.join(', ') : 'Unknown error'));
            }
        })
        .catch(error => {
            console.error("Error deleting user:", error);
            alert("An error occurred while deleting the user.");
        });
    }

    // Initial load of users
    fetchUsers();
});