document.addEventListener("DOMContentLoaded", function () {
    fetchOrders(); // Fetch orders and update both sales and customer counters

    // Logout confirmation
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        });
    }
});

async function fetchOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        alert("Unauthorized access. Please log in.");
        window.location.href = "../HTML/sign-in.php";
        return;
    }

    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/orders", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // Log the API response
        if (data.success) {
            displayOrders(data.orders);
            updateSalesCounter(data.orders); // Calculate and update the sales counter
            updateCustomerCounter(data.orders); // Calculate and update the customer counter
        } else {
            console.error("Failed to fetch orders:", data.message);
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function updateSalesCounter(orders) {
    let totalSales = 0;

    orders.forEach(order => {
        if (order.total_quantity) {
            console.log("Order Quantity:", order.total_quantity); // Log each order's total quantity
            totalSales += parseInt(order.total_quantity, 10);
        }
    });

    console.log("Total Sales:", totalSales); // Log the total sales

    const salesCounter = document.querySelector(".sales-counter");
    if (salesCounter) {
        salesCounter.textContent = totalSales;
    }
}

function updateCustomerCounter(orders) {
    const uniqueCustomers = new Set(); // Use a Set to store unique customer IDs

    // Add each customer's user_id to the Set
    orders.forEach(order => {
        if (order.user_id) {
            console.log("Customer ID:", order.user_id); // Log each customer's ID
            uniqueCustomers.add(order.user_id);
        }
    });

    const totalCustomers = uniqueCustomers.size; // Get the number of unique customers
    console.log("Total Customers:", totalCustomers); // Log the total customers

    // Update the customer counter in the UI
    const customersCounter = document.querySelector(".customers-counter");
    if (customersCounter) {
        customersCounter.textContent = totalCustomers;
    }
}

function displayOrders(orders) {
    const ordersTableBody = document.querySelector(".orders-container tbody");
    ordersTableBody.innerHTML = ""; // Clear previous data

    // Show most recent orders first
    const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Display only the recent orders
    const recentOrders = sortedOrders.slice(0, 10);

    recentOrders.forEach(order => {
        const fullName = `${order.first_name || ""} ${order.last_name || ""}`.trim();
        const formattedDate = formatDate(order.created_at);
        const statusClass = order.status.toLowerCase().replace(/ /g, '-');

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${fullName || "N/A"}</td>
            <td>${formattedDate || "N/A"}</td>
            <td><p class="status ${statusClass}">${order.status}</p></td>
        `;

        ordersTableBody.appendChild(row);
    });
}

// Function to format date into MM/DD/YYYY HH:MM AM/PM
function formatDate(dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    const options = { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: true 
    };

    return date.toLocaleString("en-US", options);
}