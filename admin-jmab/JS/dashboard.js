document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();

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

function fetchOrders() {
    const token = localStorage.getItem("authToken"); 

    if (!token) {
        console.error("No authorization token found.");
        return;
    }

    fetch("http://localhost/jmab/final-jmab/api/orders", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayOrders(data.orders); 
        } else {
            console.error("Error fetching orders:", data.errors);
        }
    })
    .catch(error => console.error("Fetch error:", error));
}


function displayOrders(orders) {
    const ordersTableBody = document.querySelector(".orders-container tbody");
    ordersTableBody.innerHTML = ""; // Clear previous data

    orders.forEach(order => {
        const fullName = `${order.first_name || ""} ${order.last_name || ""}`.trim(); // Concatenate first and last name
        const formattedDate = formatDate(order.created_at); // Convert date to 12-hour format

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