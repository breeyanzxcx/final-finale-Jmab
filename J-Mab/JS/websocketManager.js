const API_BASE_URL = "http://localhost/final-jmab/api";
const WS_MESSAGE_URL = "ws://localhost:8080/final-jmab/api"; // Fixed syntax
const WS_NOTIFICATION_URL = "ws://localhost:8081/final-jmab/api"; // Fixed syntax

class WebSocketManager {
    constructor(url, type) {
        this.url = url;
        this.type = type;
        this.webSocket = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = null;
        this.pendingMessages = new Map();
        this.deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();
        localStorage.setItem('deviceId', this.deviceId);
        this.heartbeatInterval = null;
    }

    generateDeviceId() {
        return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    connect(userId, authToken, onMessageCallback) {
        if (this.isConnected || this.isConnecting || !authToken) return;
        if (userId === -1) {
            console.error(`[${this.type}] Invalid user ID`);
            return;
        }

        this.isConnecting = true;
        this.webSocket = new WebSocket(this.url);

        this.webSocket.onopen = () => {
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            console.log(`[${this.type}] WebSocket connected - User: ${userId}, Device: ${this.deviceId}`);
            this.webSocket.send(JSON.stringify({ 
                type: "auth", 
                userId: userId, 
                deviceId: this.deviceId,
                token: authToken 
            }));
            this.startHeartbeat(userId, authToken);
            this.updateConnectionStatus(true);
        };

        this.webSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "auth") {
                    if (!data.success) {
                        console.error(`[${this.type}] WebSocket auth failed`);
                        this.close();
                    } else {
                        console.log(`[${this.type}] Auth successful for device ${this.deviceId}`);
                    }
                    return;
                }
                if (data.type === "heartbeat") {
                    console.log(`[${this.type}] Heartbeat received`);
                    return;
                }
                console.log(`[${this.type}] Received for device ${this.deviceId}:`, data);
                onMessageCallback(data);
            } catch (e) {
                console.error(`[${this.type}] Error parsing message:`, e);
            }
        };

        this.webSocket.onerror = (error) => {
            console.error(`[${this.type}] WebSocket error:`, error);
            this.isConnected = false;
            this.isConnecting = false;
            this.stopHeartbeat();
            this.scheduleReconnect(userId, authToken, onMessageCallback);
        };

        this.webSocket.onclose = (event) => {
            console.log(`[${this.type}] WebSocket closed for device ${this.deviceId}:`, event.code, event.reason);
            this.isConnected = false;
            this.isConnecting = false;
            this.stopHeartbeat();
            if (event.code !== 1000) {
                this.scheduleReconnect(userId, authToken, onMessageCallback);
            }
        };
    }

    startHeartbeat(userId, authToken) {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.webSocket) {
                this.webSocket.send(JSON.stringify({
                    type: "heartbeat",
                    userId: userId,
                    deviceId: this.deviceId,
                    token: authToken
                }));
                console.log(`[${this.type}] Heartbeat sent`);
            }
        }, 30000); // Every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    scheduleReconnect(userId, authToken, onMessageCallback) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[${this.type}] Max reconnect attempts reached`);
            return;
        }
        const delay = 5000 * (this.reconnectAttempts + 1);
        this.reconnectAttempts++;
        clearTimeout(this.reconnectTimeout);
        console.log(`[${this.type}] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        this.reconnectTimeout = setTimeout(() => 
            this.connect(userId, authToken, onMessageCallback), delay);
    }

    reconnectIfNeeded(userId, authToken, onMessageCallback) {
        if (!this.isConnected && !this.isConnecting && userId !== -1) {
            console.log(`[${this.type}] Reconnecting due to disconnection`);
            this.connect(userId, authToken, onMessageCallback);
        }
    }

    close() {
        if (this.webSocket) {
            this.webSocket.close(1000, "Normal closure");
            this.webSocket = null;
        }
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.stopHeartbeat();
        clearTimeout(this.reconnectTimeout);
        this.updateConnectionStatus(false);
    }

    send(data) {
        if (this.isConnected && this.webSocket) {
            data.deviceId = this.deviceId;
            console.log(`[${this.type}] Sending:`, data);
            this.webSocket.send(JSON.stringify(data));
        } else {
            console.warn(`[${this.type}] Cannot send - not connected`);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById(
            this.type === "message" ? "connectionStatus" : "notificationConnectionStatus"
        );
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            statusElement.className = connected ? 'status-connected' : 'status-disconnected';
            statusElement.style.cssText = `
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 3px;
                background: ${connected ? '#15DBa0' : '#ff4d4d'};
                color: white;
                margin-left: 10px;
            `;
        }
    }
}

let userId = -1;
let authToken = null;
let selectedAdminId = null;
let messagesList = [];
let notificationsList = [];
let allAdmins = [];
const messageWS = new WebSocketManager(WS_MESSAGE_URL, "message");
const notificationWS = new WebSocketManager(WS_NOTIFICATION_URL, "notification");

window.apiService = {
    getUsers: async function() {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) throw new Error("Unauthorized");
            return await response.json();
        } catch (error) {
            console.error("Error fetching users:", error);
            throw error;
        }
    },
    getAdmins: async function() {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/users/admins`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) throw new Error("Unauthorized");
            return await response.json();
        } catch (error) {
            console.error("Error fetching admins:", error);
            throw error;
        }
    },
    sendMessage: async function(messageRequest) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(messageRequest)
            });
            if (response.status === 401) throw new Error("Unauthorized");
            return await response.json();
        } catch (error) {
            console.error("Error sending message via API:", error);
            throw error;
        }
    },
    getConversation: async function(senderId, receiverId) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/messages/conversation/${senderId}/${receiverId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) throw new Error("Unauthorized");
            return await response.json();
        } catch (error) {
            console.error("Error fetching conversation:", error);
            throw error;
        }
    },
    fetchNotifications: async function(userId) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.status === 401) throw new Error("Unauthorized");
            const data = await response.json();
            if (!data.success) throw new Error("Failed to fetch notifications");
            return data.notifications || [];
        } catch (error) {
            console.error("Error fetching notifications:", error);
            throw error;
        }
    },
    markNotificationAsRead: async function(notificationId) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/notifications/read/${notificationId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ notification_id: notificationId })
            });
            if (response.status === 401) throw new Error("Unauthorized");
            const data = await response.json();
            if (!data.success) throw new Error("Failed to mark notification as read");
            return data;
        } catch (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    },
    markMessagesAsRead: async function(senderId, receiverId) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/messages/mark-read/${senderId}/${receiverId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.status === 401) throw new Error("Unauthorized");
            return await response.json();
        } catch (error) {
            console.error("Error marking messages as read:", error);
            throw error;
        }
    }
};

function toggleMessenger(event) {
    event.preventDefault();
    const messengerBox = document.getElementById('messengerBox');
    const isOpening = messengerBox.style.display !== 'block';
    messengerBox.style.display = isOpening ? 'block' : 'none';
    if (isOpening) {
        fetchAdmins();
    }
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimestamp(timestamp) {
    if (!timestamp) return getCurrentTime();
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return getCurrentTime();
    }
}

function formatNotificationTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], { 
        year: "numeric", 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
    });
}

function handleMessageReceived(data) {
    if (!data.id && !data.tempId) {
        console.warn("[Message] Received invalid message data:", data);
        return;
    }

    if (data.deviceId && data.deviceId !== messageWS.deviceId) {
        console.log("[Message] Message from another device:", data);
        if (!document.querySelector(`[data-message-id="${data.id}"]`)) {
            messagesList.push(data);
            renderMessages();
            toggleEmptyState();
            scrollToBottom();
        }
        return;
    }

    if (data.tempId && messageWS.pendingMessages.has(data.tempId)) {
        const tempMessage = messageWS.pendingMessages.get(data.tempId);
        Object.assign(tempMessage, data);
        const tempElement = document.querySelector(`[data-message-id="${data.tempId}"]`);
        if (tempElement && data.id) {
            tempElement.dataset.messageId = data.id;
            messageWS.pendingMessages.delete(data.tempId);
        }
        renderMessages();
        return;
    }

    if (data.id) {
        for (let [tempId, pendingMsg] of messageWS.pendingMessages.entries()) {
            if (pendingMsg.sender_id == data.sender_id &&
                pendingMsg.receiver_id == data.receiver_id &&
                pendingMsg.message == data.message) {
                const tempElement = document.querySelector(`[data-message-id="${tempId}"]`);
                if (tempElement) {
                    tempElement.dataset.messageId = data.id;
                    messageWS.pendingMessages.delete(tempId);
                    renderMessages();
                    return;
                }
            }
        }
    }

    if (selectedAdminId && 
        ((data.sender_id === userId && data.receiver_id === selectedAdminId) ||
         (data.sender_id === selectedAdminId && data.receiver_id === userId))) {
        displayReceivedMessage(data);
    }
}

function handleNotificationReceived(data) {
    console.log("[Notification] Received:", data);
    const existingIndex = notificationsList.findIndex(n => n.id === data.id);
    if (existingIndex >= 0) {
        notificationsList[existingIndex] = data;
    } else {
        notificationsList.unshift(data);
    }
    renderNotifications();
    scrollToTop();
    playNotificationSound();
}

async function fetchAdmins() {
    try {
        const response = await apiService.getAdmins();
        if (response.success) {
            allAdmins = response.admins || [];
            displayAdmins();
        } else {
            showToast("Failed to load admins");
        }
    } catch (error) {
        console.error("Error fetching admins:", error);
        showToast("Error loading admins");
    }
}

function displayAdmins() {
    const adminList = document.createElement('div');
    adminList.id = 'adminList';
    adminList.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        background: #02254B;
        color: white;
        border: 1px solid #fff;
        border-radius: 5px;
        padding: 10px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    `;

    let html = '';
    allAdmins.forEach(admin => {
        html += `
            <div class="admin-item" data-id="${admin.id}" style="padding: 5px 10px; cursor: pointer;">
                ${admin.first_name} ${admin.last_name}
            </div>
        `;
    });
    adminList.innerHTML = html;

    const existingList = document.getElementById('adminList');
    if (existingList) existingList.remove();

    const selector = document.createElement('span');
    selector.id = 'adminSelector';
    selector.textContent = selectedAdminId ? 
        allAdmins.find(a => a.id === selectedAdminId)?.first_name + ' ' + 
        allAdmins.find(a => a.id === selectedAdminId)?.last_name : 
        'Select Admin';
    selector.style.cssText = `
        cursor: pointer;
        padding: 5px 10px;
        font-size: 14px;
        border-radius: 5px;
        background: #02254B;
        color: white;
        border: 1px solid #fff;
    `;

    const messengerHeader = document.querySelector('.messenger-header');
    if (messengerHeader) {
        messengerHeader.style.position = 'relative';
        messengerHeader.innerHTML = 'Chat with ';
        messengerHeader.appendChild(selector);
        messengerHeader.appendChild(adminList);

        selector.addEventListener('click', (e) => {
            e.stopPropagation();
            adminList.style.display = adminList.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!messengerHeader.contains(e.target)) {
                adminList.style.display = 'none';
            }
        });
    }

    document.querySelectorAll('.admin-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            selectedAdminId = parseInt(this.getAttribute('data-id'));
            const admin = allAdmins.find(a => a.id === selectedAdminId);
            selector.textContent = admin ? `${admin.first_name} ${admin.last_name}` : 'Select Admin';
            adminList.style.display = 'none';
            fetchConversation(userId, selectedAdminId);
        });

        item.addEventListener('mouseenter', () => item.style.backgroundColor = '#0147A1');
        item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
    });
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();

    if (!messageText || userId === -1 || !authToken || !selectedAdminId) {
        showToast("Please select an admin and log in to send messages");
        return;
    }

    const tempId = addLocalMessage(messageText);
    input.value = '';

    const messageRequest = {
        sender_id: userId,
        receiver_id: selectedAdminId,
        message: messageText,
        tempId: tempId,
        deviceId: messageWS.deviceId
    };

    try {
        const apiResponse = await apiService.sendMessage(messageRequest);
        if (!apiResponse.success) {
            showToast("Failed to send message via API");
            fetchConversation(userId, selectedAdminId);
        } else {
            console.log("[Message] API send successful, pushing to WebSocket");
            messageWS.send({
                type: "message",
                sender_id: userId,
                receiver_id: selectedAdminId,
                message: messageText,
                id: apiResponse.message_id || tempId,
                timestamp: new Date().toISOString(),
                deviceId: messageWS.deviceId
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        showToast(error.message.includes("Unauthorized") ? 
            "Session expired. Please log in again." : `Network error: ${error.message}`);
        fetchConversation(userId, selectedAdminId);
    }
}

function addLocalMessage(text) {
    const tempId = `temp-${Date.now()}-${messageWS.deviceId}`;
    const tempMessage = {
        tempId: tempId,
        sender_id: userId,
        receiver_id: selectedAdminId,
        message: text,
        timestamp: new Date().toISOString(),
        status: "sent",
        is_read: 0,
        deviceId: messageWS.deviceId
    };

    messageWS.pendingMessages.set(tempId, tempMessage);
    messagesList.push(tempMessage);
    renderMessages();
    toggleEmptyState();
    scrollToBottom();
    console.log("[Message] Added local message:", tempMessage);
    return tempId;
}

function displayReceivedMessage(messageData) {
    if (!document.querySelector(`[data-message-id="${messageData.id}"]`)) {
        messagesList.push(messageData);
        renderMessages();
        toggleEmptyState();
        scrollToBottom();
        console.log("[Message] Displayed received message:", messageData);
    }
}

async function fetchConversation(senderId, receiverId) {
    try {
        const response = await apiService.getConversation(senderId, receiverId);
        if (response.success) {
            messagesList = (response.messages || []).sort((a, b) => 
                new Date(a.timestamp) - new Date(b.timestamp));
            renderMessages();
            toggleEmptyState();
            scrollToBottom();
            console.log("[Message] Conversation fetched:", messagesList);
        } else {
            showToast("Failed to load conversation");
        }
    } catch (error) {
        console.error("Error fetching conversation:", error);
        showToast("Error loading conversation");
    }
}

async function toggleNotificationDropdown(event) {
    event.preventDefault();
    const dropdown = document.getElementById("notificationDropdown");
    if (!dropdown) return;

    const isVisible = dropdown.style.display === "block";
    dropdown.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
        await fetchNotifications();
        await markAllAsRead();
    }
}

async function fetchNotifications() {
    try {
        const notifications = await apiService.fetchNotifications(userId);
        notificationsList = notifications.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at));
        renderNotifications();
        console.log("[Notification] Fetched:", notificationsList);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        showToast("Error loading notifications");
    }
}

async function markAllAsRead() {
    try {
        const unreadNotifications = notificationsList.filter(n => n.is_read === 0);
        for (const notification of unreadNotifications) {
            await apiService.markNotificationAsRead(notification.id);
            notification.is_read = 1;
        }

        if (selectedAdminId) {
            await apiService.markMessagesAsRead(userId, selectedAdminId);
            messagesList.forEach(msg => {
                if (msg.sender_id === selectedAdminId && msg.receiver_id === userId) {
                    msg.is_read = 1;
                }
            });
            renderMessages();
        }

        renderNotifications();
        console.log("[MarkAllAsRead] All marked as read");
    } catch (error) {
        console.error("Failed to mark all as read:", error);
        showToast("Failed to mark all as read");
    }
}

function renderMessages() {
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '';

    messagesList.forEach(message => {
        const li = document.createElement('li');
        li.classList.add('message-item');
        if (message.sender_id === userId) li.classList.add('sent');
        li.dataset.messageId = message.id || message.tempId;
        li.innerHTML = `
            <div class="message-content">
                ${message.message}
                <span class="message-timestamp">${formatTimestamp(message.timestamp)}</span>
                ${message.deviceId && message.deviceId !== messageWS.deviceId ? 
                    '<span class="device-info"> (Other Device)</span>' : ''}
            </div>
        `;
        messageList.appendChild(li);
    });
}

function renderNotifications() {
    const notificationList = document.getElementById("notificationList");
    const notificationBadge = document.getElementById("notificationBadge");

    if (!notificationList || !notificationBadge) return;

    notificationList.innerHTML = "";

    if (notificationsList.length === 0) {
        notificationList.innerHTML = '<li class="notification-empty">No notifications</li>';
    } else {
        notificationsList.forEach(notification => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="${notification.is_read ? '' : 'unread-notification'}">
                    <strong>${notification.title}</strong>
                    <p>${notification.message}</p>
                    <small>${formatNotificationTimestamp(notification.created_at)}</small>
                </div>
            `;
            if (notification.type === "order_update" && notification.order_id) {
                li.style.cursor = "pointer";
                li.addEventListener("click", async () => {
                    await apiService.markNotificationAsRead(notification.id);
                    window.location.href = `../HTML/order-details.html?id=${notification.order_id}`;
                });
            } else if (!notification.is_read) {
                li.style.cursor = "pointer";
                li.addEventListener("click", async () => {
                    await apiService.markNotificationAsRead(notification.id);
                    const notification = notificationsList.find(n => n.id === notification.id);
                    if (notification) {
                        notification.is_read = 1;
                        renderNotifications();
                    }
                });
            }
            notificationList.appendChild(li);
        });
    }

    const unreadCount = notificationsList.filter(n => n.is_read === 0).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? "inline-block" : "none";
}

function toggleEmptyState() {
    const noMessageIcon = document.getElementById('noMessageIcon');
    const startConvoTV = document.getElementById('startConvoTV');
    const messageList = document.getElementById('messageList');

    if (messagesList.length === 0) {
        if (noMessageIcon) noMessageIcon.style.display = 'block';
        if (startConvoTV) startConvoTV.style.display = 'block';
        messageList.style.display = 'none';
    } else {
        if (noMessageIcon) noMessageIcon.style.display = 'none';
        if (startConvoTV) startConvoTV.style.display = 'none';
        messageList.style.display = 'block';
    }
}

function scrollToBottom() {
    const messengerBody = document.getElementById('messengerBody');
    if (messengerBody) messengerBody.scrollTop = messengerBody.scrollHeight;
}

function scrollToTop() {
    const dropdown = document.getElementById("notificationDropdown");
    if (dropdown) dropdown.scrollTop = 0;
}

function getUserId() {
    const storedId = localStorage.getItem('userId');
    return storedId ? parseInt(storedId) : -1;
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
}

function playNotificationSound() {
    try {
        const audio = new Audio("../sounds/notification.mp3");
        audio.play();
    } catch (error) {
        console.error("Error playing notification sound:", error);
    }
}

function initializeApp() {
    userId = getUserId();
    authToken = getAuthToken();

    if (userId === -1 || !authToken) {
        showToast("Please log in to use chat and notifications");
        return;
    }

    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    const sendButton = document.getElementById('btn_send');
    if (sendButton) sendButton.addEventListener('click', sendMessage);

    const notificationIcon = document.getElementById("notificationIcon");
    if (notificationIcon) {
        notificationIcon.addEventListener("click", toggleNotificationDropdown);
    }

    messageWS.connect(userId, authToken, handleMessageReceived);
    notificationWS.connect(userId, authToken, handleNotificationReceived);
    fetchAdmins();
    fetchNotifications();
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        userId = getUserId();
        authToken = getAuthToken();
        messageWS.reconnectIfNeeded(userId, authToken, handleMessageReceived);
        notificationWS.reconnectIfNeeded(userId, authToken, handleNotificationReceived);
        if (selectedAdminId) fetchConversation(userId, selectedAdminId);
        fetchNotifications();
    }
});

window.addEventListener('beforeunload', () => {
    messageWS.close();
    notificationWS.close();
});

document.addEventListener('DOMContentLoaded', initializeApp);