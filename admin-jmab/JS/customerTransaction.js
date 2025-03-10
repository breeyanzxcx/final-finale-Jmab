document.addEventListener("DOMContentLoaded", function () {
    // Get the token from localStorage
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

    fetchUsers(); // Fetch users when the page loads

    // Fetch Users and Display in Table
    function fetchUsers() {
        // Add debugging to see if token exists
        console.log("Token for auth:", token);
        
        // Make the fetch request
        fetch("http://localhost/jmab/final-jmab/api/users", {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  
            },
        })
        .then(response => {
            console.log("Response status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("API response data:", data);
            
            if (data.success) {
                const tableBody = document.querySelector('#customers-table tbody');
                if (!tableBody) {
                    console.error("Table body not found!");
                    return;
                }
                
                tableBody.innerHTML = '';
                let customerCount = 0;

                data.users.forEach(user => {
                    if (user.roles === "customer") { 
                        customerCount++;
                        const row = `
                            <tr data-id="${user.id}">
                                <td>${user.first_name}</td>
                                <td>${user.last_name}</td>
                                <td>${user.email}</td>
                                <td><button class="view-btn" data-id="${user.id}">View</button></td>
                            </tr>
                        `;
                        tableBody.innerHTML += row;
                    }
                });
                
                console.log(`Found ${customerCount} customers`);

                // Attach view event listeners
                document.querySelectorAll('.view-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const userId = this.getAttribute('data-id');
                        viewTransactions(userId);
                    });
                });
            } else {
                console.error("Error fetching users:", data.errors);
                
                // Show error message on the page
                const tableBody = document.querySelector('#customers-table tbody');
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align: center; color: red;">
                                Error loading customers. Please check console for details.
                            </td>
                        </tr>
                    `;
                }
            }
        })
        .catch(error => {
            console.error("Error fetching users:", error);
            
            // Show error message on the page
            const tableBody = document.querySelector('#customers-table tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: red;">
                            Could not connect to server. Please check your connection.
                        </td>
                    </tr>
                `;
            }
        });
    }

    function viewTransactions(userId) {
        fetch(`http://localhost/jmab/final-jmab/api/users/?user_id=${userId}`)
            .then(response => response.json())
            .then(data => {
                let transactionsHTML = `<h2>Recent Transactions</h2>`;
    
                if (data.success && data.transactions && data.transactions.length > 0) {
                    transactionsHTML += `<ul>`;
                    data.transactions.forEach(transaction => {
                        transactionsHTML += `<li>Order ID: ${transaction.order_id} - ₱${transaction.amount} - ${transaction.date}</li>`;
                    });
                    transactionsHTML += `</ul>`;
                } else {
                    transactionsHTML += `
                        <div style="margin-top: 20%; display: flex; justify-content: center; align-text: center; height: 100%;">
                            <p style="font-size: 18px;">NO TRANSACTIONS</p>
                        </div>
                    `;
                }
    
                // Display transactions in the modal
                const viewContent = document.getElementById("transaction-view-content");
                if (viewContent) {
                    viewContent.innerHTML = transactionsHTML;
                    
                    const viewModal = document.getElementById("transaction-view");
                    if (viewModal) {
                        viewModal.style.display = "block";
                    }
                }
            })
            .catch(error => console.error("Error fetching transactions:", error));
    }

    // Close View function
    function closeView() {
        const viewModal = document.getElementById("transaction-view");
        if (viewModal) {
            viewModal.style.display = "none";
        }
    }

    // Attach close event listener after DOM is loaded
    const closeBtn = document.getElementById("close-view-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeView);
    }
});