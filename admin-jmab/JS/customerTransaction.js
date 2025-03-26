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

    fetchUsersWithTransactions(); // Fetch users with transactions when the page loads

    function fetchUsersWithTransactions() {
        // First fetch all users
        fetch("http://localhost/jmab/final-jmab/api/users", {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  
            },
        })
        .then(response => response.json())
        .then(usersData => {
            console.log("API response data:", usersData);
    
            if (usersData.success) {
                // Then fetch all orders to check which users have transactions
                fetch("http://localhost/jmab/final-jmab/api/orders", {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`  
                    },
                })
                .then(response => response.json())
                .then(ordersData => {
                    console.log("Orders data:", ordersData);
                    
                    if (ordersData.success) {
                        const tableBody = document.querySelector('#customers-table tbody');
                        if (!tableBody) {
                            console.error("Table body not found!");
                            return;
                        }
    
                        tableBody.innerHTML = '';
                        let customerCount = 0;
                        
                        // Create a Set of user IDs who have orders
                        const usersWithOrders = new Set();
                        if (ordersData.orders && ordersData.orders.length > 0) {
                            ordersData.orders.forEach(order => {
                                usersWithOrders.add(order.user_id);
                            });
                        }
    
                        usersData.users.forEach(user => {
                            // Only display if user is a customer AND has orders
                            if (user.roles === "customer" && usersWithOrders.has(user.id)) { 
                                customerCount++;
    
                                localStorage.setItem(`user_${user.id}`, JSON.stringify(user));
    
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
    
                        console.log(`Found ${customerCount} customers with transactions`);
    
                        if (customerCount === 0) {
                            tableBody.innerHTML = `
                                <tr>
                                    <td colspan="4" style="text-align: center; font-size: 18px; padding: 50px;">
                                        No customers with transactions found
                                    </td>
                                </tr>
                            `;
                        }
    
                        // Attach event listeners
                        document.querySelectorAll('.view-btn').forEach(button => {
                            button.addEventListener('click', function () {
                                const userId = this.getAttribute('data-id');
                                viewTransactions(userId);
                            });
                        });
                    } else {
                        console.error("Error fetching orders:", ordersData.errors);
                        displayNoCustomersMessage();
                    }
                })
                .catch(error => {
                    console.error("Error fetching orders:", error);
                    displayNoCustomersMessage();
                });
            } else {
                console.error("Error fetching users:", usersData.errors);
                displayNoCustomersMessage();
            }
        })
        .catch(error => {
            console.error("Error fetching users:", error);
            displayNoCustomersMessage();
        });
    }
    
    function displayNoCustomersMessage() {
        const tableBody = document.querySelector('#customers-table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; font-size: 18px; padding: 50px;">
                        No customers with transactions found
                    </td>
                </tr>
            `;
        }
    }

    let currentUserId = null; 

    function viewTransactions(userId) {
        const authToken = localStorage.getItem("authToken");
        currentUserId = userId; 
        
        console.log("Fetching transactions for User ID:", userId);
        
        fetch(`http://localhost/jmab/final-jmab/api/orders/${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log("Raw API response for transactions:", data);
            
            const userInfo = localStorage.getItem(`user_${userId}`);
            const user = userInfo ? JSON.parse(userInfo) : {first_name: "", last_name: ""};
            
            let transactionsHTML = `<h2>${user.first_name} ${user.last_name}'s Recent Transactions</h2>`;
            
            if (data.success && data.orders && data.orders.length > 0) {
                transactionsHTML += `<ul>`;
                data.orders.forEach(order => {
                    const price = parseFloat(order.total_price) || 0;
                    transactionsHTML += `
                        <li class="order-item" data-order-id="${order.order_id}">
                            <span>Order ID: ${order.order_id} - ₱${price.toFixed(2)} - ${order.created_at}</span>
                            <button class="view-order-details-btn" data-order-id="${order.order_id}">View Details</button>
                        </li>
                    `;
                });
                transactionsHTML += `</ul>`;
            } else {
                transactionsHTML += `<p style="text-align: center; font-size: 18px; margin-top: 50px;">NO TRANSACTIONS</p>`;
            }
            
            transactionsHTML += `<button id="close-transactions-btn">Close</button>`;
            
            const viewContent = document.getElementById("transaction-view-content");
            if (viewContent) {
                viewContent.innerHTML = transactionsHTML;
                document.getElementById("transaction-view").style.display = "block";
                
                document.querySelectorAll('.view-order-details-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const orderId = this.getAttribute('data-order-id');
                        displayOrderDetails(data.orders, orderId);
                    });
                });
                
                const closeBtn = document.getElementById("close-transactions-btn");
                if (closeBtn) {
                    closeBtn.addEventListener("click", function() {
                        document.getElementById("transaction-view").style.display = "none";
                    });
                }
            }
        })
        .catch(error => console.error("Error fetching transactions:", error));
    }

    function displayOrderDetails(orders, orderId) {
        const orderDetails = orders.filter(order => order.order_id == orderId);
        let orderDetailsHTML = `<h3>Order Details for Order ID: ${orderId}</h3>`;
        
        if (orderDetails.length > 0) {
            orderDetailsHTML += `<div class="order-details-container">`;
            orderDetails.forEach(detail => {
                const price = detail.variant_price !== undefined 
                    ? parseFloat(detail.variant_price).toFixed(2) 
                    : "N/A"; 
                orderDetailsHTML += `
                    <div class="order-detail-item">
                        <p><strong>Product:</strong> ${detail.product_name}</p>
                        <p><strong>Quantity:</strong> ${detail.quantity}</p>
                        <p><strong>Price:</strong> ₱${price}</p>
                        <p><strong>Brand:</strong> ${detail.product_brand}</p>
                    </div>
                    <hr> 
                `;
            });
            orderDetailsHTML += `</div>`;
        } else {
            orderDetailsHTML += `<p style="text-align: center; font-size: 18px; margin-top: 50px;">NO ORDER DETAILS</p>`;
        }
        
        // Add the "Return to Transactions" button
        orderDetailsHTML += `<button id="return-to-transactions-btn">Return to Transactions</button>`;
    
        const viewContent = document.getElementById("transaction-view-content");
        if (viewContent) {
            viewContent.innerHTML = orderDetailsHTML;
    
            // Attach event listener to the "Return to Transactions" button
            const returnBtn = document.getElementById("return-to-transactions-btn");
            if (returnBtn) {
                returnBtn.addEventListener("click", function () {
                    if (currentUserId) {
                        viewTransactions(currentUserId); // Return to recent transactions
                    }
                });
            }
        }
    }
});