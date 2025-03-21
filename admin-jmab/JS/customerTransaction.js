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

    function fetchUsers() {
        fetch("http://localhost/jmab/final-jmab/api/users", {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  
            },
        })
        .then(response => response.json())
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
    
                        // Store user_id in localStorage for later use
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
    
                console.log(`Found ${customerCount} customers`);
    
                // Attach event listeners
                document.querySelectorAll('.view-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const userId = this.getAttribute('data-id');
                        viewTransactions(userId);
                    });
                });
            } else {
                console.error("Error fetching users:", data.errors);
            }
        })
        .catch(error => console.error("Error fetching users:", error));
    }
    
    let currentUserId = null; // Store the current user ID globally

    function viewTransactions(userId) {
        const authToken = localStorage.getItem("authToken");
        currentUserId = userId; // Save the userId for the "Return" button
        
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
            
            // Get user info from localStorage if available
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
            
            // Add a "Close" button to close the popup
            transactionsHTML += `<button id="close-transactions-btn">Close</button>`;
            
            const viewContent = document.getElementById("transaction-view-content");
            if (viewContent) {
                viewContent.innerHTML = transactionsHTML;
                document.getElementById("transaction-view").style.display = "block";
                
                // Attach event listeners to view order details buttons
                document.querySelectorAll('.view-order-details-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const orderId = this.getAttribute('data-order-id');
                        displayOrderDetails(data.orders, orderId);
                    });
                });
                
                // Attach event listener to the "Close" button
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
                    : "N/A"; // Use variant_price instead of product_price
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