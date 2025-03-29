// Global chart variables
let salesChart = null;
let customersChart = null;
let notificationList = [];

document.addEventListener("DOMContentLoaded", function () {
    const userId = parseInt(localStorage.getItem('userId')) || -1;
    const authToken = localStorage.getItem('authToken');

    // Authentication check
    if (userId === -1 || !authToken) {
        console.error('User not authenticated');
        window.location.href = '../J-Mab/HTML/sign-in.php';
        return;
    }

    // Initialize WebSocket for notifications
    const notificationWS = new WebSocketManager(WS_NOTIFICATION_URL, "notification");
    notificationWS.connect(userId, authToken, handleNotificationReceived);

    // Event listeners
    setupEventListeners();

    // Initial data fetch
    fetchNotifications();
    fetchOrders();
    setInterval(fetchOrders, 60000); // Poll every minute as fallback
});

// Event listener setup
function setupEventListeners() {
    // Notification dropdown
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationDropdown = document.getElementById('notificationDropdown');
    notificationIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = notificationDropdown.style.display === 'block';
        notificationDropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            fetchNotifications();
            markAllAsRead();
        }
    });

    // Help bubble
    const helpBubble = document.getElementById('helpBubble');
    const contactPopup = document.getElementById('contactPopup');
    helpBubble.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target !== contactPopup && !contactPopup.contains(e.target)) {
            contactPopup.style.display = contactPopup.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logout');
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    const modalClose = document.querySelector('.modal-close');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                localStorage.clear(); // Clear auth data
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        });
    }

    // Close dropdowns on outside click
    window.addEventListener('click', (e) => {
        if (!notificationIcon.contains(e.target)) notificationDropdown.style.display = 'none';
        if (!helpBubble.contains(e.target)) contactPopup.style.display = 'none';
    });

    // Reconnect WebSocket on visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const userId = parseInt(localStorage.getItem('userId'));
            const authToken = localStorage.getItem('authToken');
            notificationWS.reconnectIfNeeded(userId, authToken, handleNotificationReceived);
            fetchNotifications();
        }
    });

    // Close WebSocket on page unload
    window.addEventListener('beforeunload', () => notificationWS.close());
}

// Notification handling
function handleNotificationReceived(data) {
    if (data.type === 'notification') {
        const existingIndex = notificationList.findIndex(n => n.id === data.id);
        if (existingIndex >= 0) {
            notificationList[existingIndex] = data;
        } else {
            notificationList.unshift(data);
        }
        renderNotifications();
        playNotificationSound();
        if (data.message?.toLowerCase().includes('order')) fetchOrders();
    }
}

async function fetchNotifications() {
    try {
        const userId = parseInt(localStorage.getItem('userId'));
        const notifications = await apiService.fetchNotifications(userId);
        notificationList = notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderNotifications();
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

async function markAllAsRead() {
    try {
        const unreadNotifications = notificationList.filter(n => n.is_read === 0);
        for (const notification of unreadNotifications) {
            await apiService.markNotificationAsRead(notification.id);
            notification.is_read = 1;
        }
        renderNotifications();
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
    }
}

async function deleteNotification(notificationId) {
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost/jmab/final-jmab/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            notificationList = notificationList.filter(n => n.id !== notificationId);
            renderNotifications();
        } else {
            console.error('Failed to delete notification:', data.message);
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

function renderNotifications() {
    const notificationListElement = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationBadge');
    if (!notificationListElement || !notificationBadge) return;

    notificationListElement.innerHTML = notificationList.length === 0
        ? '<li class="notification-empty">No notifications</li>'
        : notificationList.map(notification => `
            <li>
                <div class="notification-content ${notification.is_read ? '' : 'unread-notification'}">
                    <strong>${notification.title || 'Notification'}</strong>
                    <p>${notification.message}</p>
                    <small>${formatNotificationTimestamp(notification.created_at)}</small>
                </div>
                <div class="trash-icon" data-notification-id="${notification.id}">
                    <i class="fas fa-trash"></i>
                </div>
            </li>
        `).join('');

    notificationListElement.querySelectorAll('.trash-icon').forEach(icon => {
        icon.addEventListener('click', (e) => deleteNotification(parseInt(e.currentTarget.getAttribute('data-notification-id'))));
    });

    const unreadCount = notificationList.filter(n => n.is_read === 0).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

function formatNotificationTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
}

function playNotificationSound() {
    try {
        new Audio('../sounds/notification.mp3').play();
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Order handling
async function fetchOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        alert("Unauthorized access. Please log in.");
        window.location.href = "../J-Mab/HTML/sign-in.php";
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

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        if (data.success && data.orders?.length > 0) {
            displayOrders(data.orders);
            updateSalesCounter(data.orders);
            updateCustomerCounter(data.orders);
            updateSalesChart(data.orders);
            updateCustomersChart(data.orders);
        } else {
            console.warn("No orders found or API returned empty data");
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function updateSalesCounter(orders) {
    const totalSales = orders.reduce((sum, order) => sum + (parseInt(order.total_quantity, 10) || 0), 0);
    const salesCounter = document.querySelector(".sales-counter");
    if (salesCounter) salesCounter.textContent = totalSales;
}

function updateCustomerCounter(orders) {
    const uniqueCustomers = new Set(orders.map(order => order.user_id).filter(id => id));
    const customersCounter = document.querySelector(".customers-counter");
    if (customersCounter) customersCounter.textContent = uniqueCustomers.size;
}

function formatOrderItems(order) {
    console.log("Processing order for items:", order);

    let items = [];
    if (order.items && Array.isArray(order.items)) {
        items = order.items;
    } else if (order.order_items && Array.isArray(order.order_items)) {
        items = order.order_items;
    } else if (order.product_details) {
        if (Array.isArray(order.product_details)) {
            items = order.product_details;
        } else if (typeof order.product_details === 'object') {
            items = [order.product_details];
        } else if (typeof order.product_details === 'string') {
            // Handle plain text product_details instead of assuming JSON
            const rawDetails = order.product_details.trim();
            console.log("Raw product_details:", rawDetails);

            // Attempt to extract name and quantity from the string
            const match = rawDetails.match(/^(.*?)(?:\s*\(x(\d+)\))?$/i);
            if (match) {
                let name = match[1].trim();
                const quantity = match[2] ? parseInt(match[2], 10) : 1;

                // Remove duplicate name if present (e.g., "Motul 8100 X-cess - Motul 8100 X-cess")
                const parts = name.split(' - ').filter((part, index, self) => 
                    self.indexOf(part) === index
                ); // Keep unique parts
                name = parts.join(' - ');

                items = [{ name, quantity }];
            } else {
                items = [{ name: rawDetails, quantity: 1 }];
            }
        }
    }

    if (items.length === 0) {
        console.warn("No items found in order:", order);
        return "No items found";
    }

    const formattedItems = items.map(item => {
        const name = item.name || item.product_name || item.model || "Unknown Product";
        const quantity = item.quantity || item.qty || 1;
        return `${name} (${quantity})`;
    }).join(', ');

    console.log("Formatted items:", formattedItems);
    return formattedItems;
}

function displayOrders(orders) {
    const ordersTableBody = document.querySelector(".orders-container tbody");
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = "";
    const recentOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

    recentOrders.forEach(order => {
        const fullName = `${order.first_name || ""} ${order.last_name || ""}`.trim();
        const formattedDate = formatDate(order.created_at);
        const statusClass = order.status.toLowerCase().replace(/ /g, '-');
        const itemDetails = formatOrderItems(order);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${fullName || "N/A"}</td>
            <td>${formattedDate || "N/A"}</td>
            <td class="items-cell">${itemDetails}<div class="items-tooltip">${itemDetails}</div></td>
            <td><p class="status ${statusClass}">${order.status}</p></td>
        `;
        ordersTableBody.appendChild(row);
    });
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { 
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true 
    });
}

function updateSalesChart(orders) {
    const categoryCounts = { 'Tires': 0, 'Batteries': 0, 'Oils': 0, 'Lubricants': 0 };
    
    orders.forEach(order => {
        console.log("Processing order for sales chart:", order);

        const items = order.items || order.order_items || (order.product_details ? [order.product_details] : []);
        if (items.length > 0) {
            items.forEach(item => {
                let category = (item.category || '').toLowerCase();
                const quantity = parseInt(item.quantity || item.qty || 1, 10);

                // Improved category detection
                let name = '';
                if (item.name) {
                    name = item.name.toLowerCase();
                } else if (typeof item === 'string') {
                    name = item.toLowerCase();
                }

                // More robust category inference
                if (!category) {
                    // Specific tire detection
                    const tireSizes = ['225/60r18', '225/60r17', '225/65r17', '215/55r17'];
                    const tireBrands = ['avid', 'michelin', 'goodyear', 'pirelli', 'continental'];
                    
                    const hasTireSize = tireSizes.some(size => name.includes(size));
                    const hasTireBrand = tireBrands.some(brand => name.includes(brand));
                    
                    // Check for tire-specific keywords
                    const isTire = hasTireSize || 
                                   hasTireBrand || 
                                   name.includes('tire') || 
                                   name.includes('tread') || 
                                   name.includes('wheel');

                    // Battery detection
                    const batteryKeywords = ['battery', 'car battery', 'automotive battery'];
                    const isBattery = batteryKeywords.some(keyword => name.includes(keyword));

                    // Category assignment
                    if (isTire) category = 'tire';
                    else if (isBattery) category = 'battery';
                    else if (name.includes('oil') && !name.includes('lubricant')) category = 'oil';
                    else if (name.includes('lubricant')) category = 'lubricant';
                }

                console.log("Processed Item:", { 
                    name: item.name || item, 
                    category, 
                    quantity,
                    detectionDetails: {
                        originalName: name
                    }
                });

                // Category counting with more flexible matching
                if (category.includes('tire')) categoryCounts['Tires'] += quantity;
                else if (category.includes('battery')) categoryCounts['Batteries'] += quantity;
                else if (category.includes('oil')) categoryCounts['Oils'] += quantity;
                else if (category.includes('lubricant')) categoryCounts['Lubricants'] += quantity;
            });
        } else if (order.total_quantity && order.category) {
            const category = order.category.toLowerCase();
            const quantity = parseInt(order.total_quantity, 10);
            
            if (category.includes('tire')) categoryCounts['Tires'] += quantity;
            else if (category.includes('battery')) categoryCounts['Batteries'] += quantity;
            else if (category.includes('oil')) categoryCounts['Oils'] += quantity;
            else if (category.includes('lubricant')) categoryCounts['Lubricants'] += quantity;
        }
    });

    console.log("Final Category Counts:", categoryCounts);

    // Chart rendering remains the same as in your original function
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;
    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                label: 'Items Sold',
                data: Object.values(categoryCounts),
                backgroundColor: 'rgba(21, 219, 160, 0.7)',
                borderColor: 'rgba(21, 219, 160, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                title: { display: true, text: 'Sales by Category' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quantity' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateCustomersChart(orders) {
    const statusCounts = { 'Pending': 0, 'Processing': 0, 'Out for Delivery': 0, 'Delivered': 0, 'Cancelled': 0 };
    orders.forEach(order => {
        const status = order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase();
        if (status in statusCounts) statusCounts[status]++;
        else if (status === 'Out-for-delivery') statusCounts['Out for Delivery']++;
        else if (status === 'Cancelled') statusCounts['Cancelled']++;
    });

    const ctx = document.getElementById('customersChart')?.getContext('2d');
    if (!ctx) return;
    if (customersChart) customersChart.destroy();

    customersChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                label: 'Orders by Status',
                data: Object.values(statusCounts),
                backgroundColor: [
                    'rgba(255, 193, 7, 0.7)', 'rgba(0, 123, 255, 0.7)', 'rgba(74, 127, 114, 0.7)',
                    'rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 193, 7, 1)', 'rgba(0, 123, 255, 1)', 'rgba(74, 127, 114, 1)',
                    'rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                title: { display: true, text: 'Customer Orders by Status' }
            }
        }
    });
}