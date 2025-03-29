// common.js - Shared functionality across admin pages

// Global variables
let notificationWS = null;
let notificationList = [];

// Initialize common functionality
function initCommon() {
    const userId = parseInt(localStorage.getItem('userId')) || -1;
    const authToken = localStorage.getItem('authToken');

    // Authentication check
    if (userId === -1 || !authToken) {
        window.location.href = '../J-Mab/HTML/sign-in.php';
        return;
    }

    // Initialize WebSocket for notifications
    notificationWS = new WebSocketManager(WS_NOTIFICATION_URL, "notification");
    notificationWS.connect(userId, authToken, handleNotificationReceived);

    // Setup event listeners
    setupEventListeners();

    // Initial data fetch
    fetchNotifications();
}

// Event listener setup
function setupEventListeners() {
    // Notification dropdown
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationIcon && notificationDropdown) {
        notificationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = notificationDropdown.style.display === 'block';
            notificationDropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                fetchNotifications();
                markAllAsRead();
            }
        });
    }

    // Help bubble
    const helpBubble = document.getElementById('helpBubble');
    const contactPopup = document.getElementById('contactPopup');
    
    if (helpBubble && contactPopup) {
        helpBubble.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target !== contactPopup && !contactPopup.contains(e.target)) {
                contactPopup.style.display = contactPopup.style.display === 'block' ? 'none' : 'block';
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                localStorage.clear();
                if (notificationWS) notificationWS.close();
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        });
    }

    // Close dropdowns on outside click
    window.addEventListener('click', (e) => {
        const notificationContainer = document.querySelector('.notification-container');
        if (notificationContainer && !notificationContainer.contains(e.target)) {
            notificationDropdown.style.display = 'none';
        }
        if (helpBubble && !helpBubble.contains(e.target)) {
            contactPopup.style.display = 'none';
        }
    });

    // Reconnect WebSocket on visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const userId = parseInt(localStorage.getItem('userId'));
            const authToken = localStorage.getItem('authToken');
            if (notificationWS) {
                notificationWS.reconnectIfNeeded(userId, authToken, handleNotificationReceived);
            }
            fetchNotifications();
        }
    });

    // Close WebSocket on page unload
    window.addEventListener('beforeunload', () => {
        if (notificationWS) notificationWS.close();
    });
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
    }
}

async function fetchNotifications() {
    try {
        const userId = parseInt(localStorage.getItem('userId'));
        const response = await fetch(`http://localhost/jmab/final-jmab/api/notifications?userId=${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const data = await response.json();
        notificationList = Array.isArray(data) ? data : data.notifications || [];
        notificationList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
        const response = await fetch(`http://localhost/jmab/final-jmab/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
            }
        });
        
        const data = await response.json();
        if (data.success) {
            notificationList = notificationList.filter(n => n.id !== notificationId);
            renderNotifications();
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

    // Add event listeners to trash icons
    notificationListElement.querySelectorAll('.trash-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNotification(parseInt(e.currentTarget.getAttribute('data-notification-id')));
        });
    });

    // Update badge count
    const unreadCount = notificationList.filter(n => n.is_read === 0).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

function formatNotificationTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function playNotificationSound() {
    try {
        const audio = new Audio('../sounds/notification.mp3');
        audio.play().catch(e => console.error('Error playing sound:', e));
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCommon);