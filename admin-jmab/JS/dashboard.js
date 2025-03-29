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

function diagnosticProductData(orders) {
    console.clear(); // Clear previous console messages
    console.log("%c PRODUCT DATA DIAGNOSTIC ", "background:red; color:white; font-size:20px");
    
    if (!orders || orders.length === 0) {
        console.log("No orders data available!");
        return;
    }
    
    console.log(`Total orders: ${orders.length}`);
    
    // Extract all product info to see exact structure
    orders.forEach((order, index) => {
        console.log(`\n%c ORDER #${index+1} ID:${order.id || 'unknown'} %c`, 
                   "background:#333; color:white; padding:3px", "");
        
        // Log raw order data for inspection
        console.log("Full order object:", order);
        
        // Check what fields exist
        const hasItems = !!order.items;
        const hasOrderItems = !!order.order_items;
        const hasProductDetails = !!order.product_details;
        
        console.log("Available product fields:", {
            items: hasItems ? `(${typeof order.items})` : "missing",
            order_items: hasOrderItems ? `(${typeof order.order_items})` : "missing",
            product_details: hasProductDetails ? `(${typeof order.product_details})` : "missing"
        });
        
        // Inspect product_details (since that's what the original code uses)
        if (hasProductDetails) {
            console.log("%c PRODUCT DETAILS: %c", "background:blue; color:white", "");
            
            if (typeof order.product_details === 'string') {
                console.log(`Raw string: "${order.product_details}"`);
                
                // Try to extract actual product name
                const cleaned = order.product_details.replace(/\(x\d+\)/g, '').trim();
                console.log(`Cleaned name: "${cleaned}"`);
                
                // Check for keywords
                const keywords = ['oil', 'battery', 'tire', 'tyre', 'lubricant', 'motul', '8100'];
                keywords.forEach(keyword => {
                    if (cleaned.toLowerCase().includes(keyword)) {
                        console.log(`✓ Contains keyword: ${keyword}`);
                    }
                });
                
            } else if (typeof order.product_details === 'object') {
                console.log("Product details object:", order.product_details);
            }
        }
        
        // Try to manually extract product info using the same logic as formatOrderItems
        console.log("%c EXTRACTED ITEMS: %c", "background:green; color:white", "");
        let extractedItems = [];
        
        try {
            if (order.items && Array.isArray(order.items)) {
                extractedItems = order.items;
                console.log("From order.items:", extractedItems);
            } else if (order.order_items && Array.isArray(order.order_items)) {
                extractedItems = order.order_items;
                console.log("From order.order_items:", extractedItems);
            } else if (order.product_details) {
                if (Array.isArray(order.product_details)) {
                    extractedItems = order.product_details;
                    console.log("From product_details array:", extractedItems);
                } else if (typeof order.product_details === 'object') {
                    extractedItems = [order.product_details];
                    console.log("From product_details object:", extractedItems);
                } else if (typeof order.product_details === 'string') {
                    const rawDetails = order.product_details.trim();
                    console.log("Parsing string:", rawDetails);
                    
                    const match = rawDetails.match(/^(.*?)(?:\s*\(x(\d+)\))?$/i);
                    if (match) {
                        let name = match[1].trim();
                        const quantity = match[2] ? parseInt(match[2], 10) : 1;
                        extractedItems = [{ name, quantity }];
                    } else {
                        extractedItems = [{ name: rawDetails, quantity: 1 }];
                    }
                    console.log("From product_details string:", extractedItems);
                }
            }
        } catch (error) {
            console.error("Error extracting items:", error);
        }
        
        // Test categorization directly
        if (extractedItems.length > 0) {
            console.log("%c CATEGORIZATION TEST: %c", "background:purple; color:white", "");
            extractedItems.forEach(item => {
                const name = item.name || item.product_name || item.model || "";
                if (!name) {
                    console.log("Item has no name:", item);
                    return;
                }
                
                console.log(`Testing categorization for: "${name}"`);
                
                // Test each category explicitly
                const lowerName = name.toLowerCase();
                if (lowerName.includes('oil') || lowerName.includes('motul') || lowerName.includes('8100')) {
                    console.log("✓ Should be categorized as: Oils");
                } else if (lowerName.includes('batt')) {
                    console.log("✓ Should be categorized as: Batteries");
                } else if (lowerName.includes('tire') || lowerName.includes('tyre')) {
                    console.log("✓ Should be categorized as: Tires");
                } else if (lowerName.includes('lubricant') || lowerName.includes('fluid')) {
                    console.log("✓ Should be categorized as: Lubricants");
                } else {
                    console.log("✗ No category match - would go to Other");
                }
            });
        }
    });
    
    console.log("%c END DIAGNOSTIC %c", "background:red; color:white; font-size:15px", "");
}
diagnosticProductData(data.orders);

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
    console.log("=====================================================");
    console.log("SALES CHART DEBUG: Starting with orders:", orders);
    
    function determineCategory(productName) {
        const name = productName.toLowerCase().trim();
        console.log(`Categorizing product: "${name}"`);
        
        const categories = {
            'Tires': ['tire', 'tyre', 'wheel', 'rim', 'michelin', 'goodyear', 'bridgestone', 'pirelli', 'continental', 'dunlop'],
            'Batteries': ['battery', 'batt', 'accumulator', 'power cell', 'energizer', 'duracell', 'exide', 'optima', 'accu'],
            'Oils': ['oil', 'engine oil', 'motor oil', 'synthetic', 'conventional', 'castrol', 'mobil', 'shell', 'valvoline', 'pennzoil', 'motul', '8100', 'x-cess', 'x-clean', 'specific', 'quartz'],
            'Lubricants': ['lubricant', 'grease', 'lube', 'fluid', 'hydraulic', 'transmission', 'brake fluid', 'coolant', 'antifreeze', 'wd-40']
        };
        
        // Special case for "lubricant and battery"
        if (name.includes('lubricant') && name.includes('battery')) {
            console.log("  ✓ Special case: Contains both 'lubricant' and 'battery'");
            return 'Split'; // We'll handle this separately
        }
        
        for (const [category, keywords] of Object.entries(categories)) {
            for (const keyword of keywords) {
                if (name.includes(keyword)) {
                    console.log(`  ✓ Matched "${keyword}" → Category: ${category}`);
                    return category;
                }
            }
        }
        
        console.log("  ✗ No category match → Category: Other");
        return 'Other';
    }
    
    const categoryCounts = {
        'Tires': 0,
        'Batteries': 0,
        'Oils': 0,
        'Lubricants': 0,
        'Other': 0
    };
    
    const categorizedProducts = {
        'Tires': [],
        'Batteries': [],
        'Oils': [],
        'Lubricants': [],
        'Other': []
    };
    
    orders.forEach((order, index) => {
        console.log(`\nOrder #${index+1} - ID: ${order.id || 'unknown'}`);
        console.log(`Raw order data:`, order);
        
        let items = [];
        let extractionMethod = "none";
        
        if (order.items && Array.isArray(order.items)) {
            items = order.items;
            extractionMethod = "items array";
        } else if (order.order_items && Array.isArray(order.order_items)) {
            items = order.order_items;
            extractionMethod = "order_items array";
        } else if (order.product_details) {
            if (Array.isArray(order.product_details)) {
                items = order.product_details;
                extractionMethod = "product_details array";
            } else if (typeof order.product_details === 'object') {
                items = [order.product_details];
                extractionMethod = "product_details object";
            } else if (typeof order.product_details === 'string') {
                extractionMethod = "product_details string";
                const rawDetails = order.product_details.trim();
                console.log(`Parsing product_details string: "${rawDetails}"`);
                
                if (rawDetails.includes(',')) {
                    const products = rawDetails.split(',').map(p => p.trim());
                    items = products.map(product => {
                        const match = product.match(/^(.*?)(?:\s*\(x?(\d+)\))?$/i);
                        if (match) {
                            let name = match[1].trim();
                            const quantity = match[2] ? parseInt(match[2], 10) : 1;
                            return { name, quantity };
                        }
                        return { name: product, quantity: 1 };
                    });
                } else {
                    const match = rawDetails.match(/^(.*?)(?:\s*\(x?(\d+)\))?$/i);
                    if (match) {
                        let name = match[1].trim();
                        const quantity = match[2] ? parseInt(match[2], 10) : 1;
                        items = [{ name, quantity }];
                    } else {
                        items = [{ name: rawDetails, quantity: 1 }];
                    }
                }
            }
        }
        
        console.log(`Extraction method: ${extractionMethod}`);
        console.log(`Extracted items:`, items);
        
        items.forEach(item => {
            const name = (item.name || item.product_name || item.model || "").trim();
            const quantity = parseInt(item.quantity || item.qty || 1, 10);
            
            console.log(`\nProcessing item: "${name}" (Quantity: ${quantity})`);
            
            if (!name) {
                console.log("Skipping item with empty name");
                return;
            }
            
            const category = determineCategory(name);
            
            if (category === 'Split') {
                // Handle "lubricant and battery" by splitting the quantity
                categoryCounts['Lubricants'] += quantity;
                categoryCounts['Batteries'] += quantity;
                categorizedProducts['Lubricants'].push(`${name} (${quantity})`);
                categorizedProducts['Batteries'].push(`${name} (${quantity})`);
                console.log(`  ✓ Split: Added ${quantity} to both Lubricants and Batteries`);
            } else {
                categoryCounts[category] += quantity;
                categorizedProducts[category].push(`${name} (${quantity})`);
            }
        });
    });
    
    console.log("\n===== CATEGORIZATION RESULTS =====");
    for (const [category, products] of Object.entries(categorizedProducts)) {
        console.log(`${category} (${products.length} products):`);
        products.forEach(p => console.log(`  - ${p}`));
    }
    console.log("Category counts:", categoryCounts);
    console.log("=====================================================");
    
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) {
        console.error("Could not find salesChart canvas element");
        return;
    }
    
    if (salesChart) {
        console.log("Destroying existing chart");
        salesChart.destroy();
    }

    console.log("Creating new chart with data:", categoryCounts);
    salesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    '#FF6384', // Tires
                    '#36A2EB', // Batteries
                    '#FFCE56', // Oils
                    '#4BC0C0', // Lubricants
                    '#9966FF'  // Other
                ],
                borderWidth: 1
            }]
        },
        options: getPieChartOptions('Sales Distribution')
    });
    console.log("Chart created successfully");
}

function updateCustomersChart(orders) {
    const statusCounts = { 
        'Pending': 0, 
        'Processing': 0, 
        'Out for Delivery': 0, 
        'Delivered': 0, 
        'Cancelled': 0 
    };
    
    orders.forEach(order => {
        const status = order.status.charAt(0).toUpperCase() + 
                      order.status.slice(1).toLowerCase();
        
        if (status in statusCounts) {
            statusCounts[status]++;
        } else if (status === 'Out-for-delivery') {
            statusCounts['Out for Delivery']++;
        } else if (status === 'Cancelled') {
            statusCounts['Cancelled']++;
        }
    });

    const ctx = document.getElementById('customersChart')?.getContext('2d');
    if (!ctx) return;
    if (customersChart) customersChart.destroy();

    customersChart = new Chart(ctx, {
        type: 'pie', // Regular pie chart without hole
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#FF9F40', // Pending
                    '#36A2EB', // Processing
                    '#4BC0C0', // Out for Delivery
                    '#00CC99', // Delivered
                    '#FF6384'  // Cancelled
                ],
                borderWidth: 1
            }]
        },
        options: getPieChartOptions('Order Status Distribution')
    });
}

// Common options for both pie charts
function getPieChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                    padding: 20,
                    font: {
                        size: 12
                    },
                    usePointStyle: true, // Round legend markers
                    pointStyle: 'circle'
                }
            },
            title: {
                display: true,
                text: title,
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: {
                    top: 10,
                    bottom: 20
                },
                color: '#02254B' // Your theme color
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                },
                bodyFont: {
                    size: 12
                },
                titleFont: {
                    size: 14,
                    weight: 'bold'
                }
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    };
}