const API_BASE_URL = "http://localhost/final-jmab/api";
const WS_URL = "http://192.168.100.74:8080";

// WebSocket Manager
let webSocket = null;
let isConnected = false;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let userId = -1;
let authToken = null;
let selectedAdminId = null; 
let reconnectTimeout = null;
let pendingMessages = new Map();
let allAdmins = [];

// API Service
const apiService = {
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
  }
};

// DOM manipulation functions
function toggleMessenger(event) {
  event.preventDefault();
  const messengerBox = document.getElementById('messengerBox');
  const isOpening = messengerBox.style.display !== 'block';
  messengerBox.style.display = isOpening ? 'block' : 'none';
  if (isOpening) {
    fetchAdmins(); // Fetch admins when opening
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

// WebSocket connection management
function connectWebSocket(userId) {
  if (isConnected || isConnecting || !authToken) return;
  if (userId === -1) {
    console.error("Invalid user ID");
    return;
  }

  isConnecting = true;
  webSocket = new WebSocket(WS_URL);

  webSocket.onopen = function() {
    isConnected = true;
    isConnecting = false;
    reconnectAttempts = 0;
    console.log(`WebSocket connected for userId: ${userId}`);
    webSocket.send(JSON.stringify({ userId: userId, token: authToken }));
    updateConnectionStatus(true);
    // Refresh conversation if an admin is selected
    if (selectedAdminId) fetchConversation(userId, selectedAdminId);
  };

  webSocket.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "auth") {
        if (!data.success) {
          console.error("WebSocket auth failed");
          closeConnection();
        }
        return;
      }
      console.log("WebSocket received:", data);

      // Handle echoed message with tempId
      if (data.tempId && pendingMessages.has(data.tempId)) {
        const tempMessage = pendingMessages.get(data.tempId);
        if (tempMessage) {
          Object.assign(tempMessage, data);
          const tempElement = document.querySelector(`[data-message-id="${data.tempId}"]`);
          if (tempElement && data.id) {
            tempElement.dataset.messageId = data.id;
            pendingMessages.delete(data.tempId);
          }
        }
        return;
      }

      // Handle server-confirmed message
      if (data.id) {
        for (let [tempId, pendingMsg] of pendingMessages.entries()) {
          if (pendingMsg.sender_id == data.sender_id &&
              pendingMsg.receiver_id == data.receiver_id &&
              pendingMsg.message == data.message) {
            const tempElement = document.querySelector(`[data-message-id="${tempId}"]`);
            if (tempElement) {
              tempElement.dataset.messageId = data.id;
              pendingMessages.delete(tempId);
              return;
            }
          }
        }
      }

      // Display new message if it matches the current conversation
      if (selectedAdminId && 
          ((data.sender_id === userId && data.receiver_id === selectedAdminId) ||
           (data.sender_id === selectedAdminId && data.receiver_id === userId))) {
        displayReceivedMessage(data);
      }
    } catch (e) {
      console.error("Error parsing WebSocket message:", e);
    }
  };

  webSocket.onerror = function(error) {
    console.error("WebSocket error:", error);
    isConnected = false;
    isConnecting = false;
    scheduleReconnect();
  };

  webSocket.onclose = function(event) {
    console.log("WebSocket closed:", event.reason);
    isConnected = false;
    isConnecting = false;
    if (event.code !== 1000) scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error("Max reconnect attempts reached");
    return;
  }
  const delay = 5000 * (reconnectAttempts + 1);
  reconnectAttempts++;
  clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => connectWebSocket(userId), delay);
}

function reconnectIfNeeded() {
  if (!isConnected && !isConnecting && userId !== -1) {
    connectWebSocket(userId);
  }
}

function closeConnection() {
  if (webSocket) {
    webSocket.close(1000, "Normal closure");
    webSocket = null;
  }
  isConnected = false;
  isConnecting = false;
  reconnectAttempts = 0;
  clearTimeout(reconnectTimeout);
  updateConnectionStatus(false);
}

// UI updates
function updateConnectionStatus(connected) {
  const statusElement = document.getElementById('connectionStatus');
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

// Message handling
let messagesList = [];

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
    top: 100%; /* Below the header */
    right: 0; /* Align to the right edge of the header */
    background: #02254B; /* Match header background */
    color: white;
    border: 1px solid #fff; /* Match your select border */
    border-radius: 5px;
    padding: 10px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    display: none; /* Hidden by default */
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Match messenger-box shadow */
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

  // Create a selector span
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
    border: 1px solid #fff; /* Match your select style */
  `;

  const messengerHeader = document.querySelector('.messenger-header');
  if (messengerHeader) {
    messengerHeader.style.position = 'relative';
    messengerHeader.innerHTML = 'Chat with '; // Base text
    messengerHeader.appendChild(selector);
    messengerHeader.appendChild(adminList);

    // Toggle dropdown on click
    selector.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent document click from closing immediately
      adminList.style.display = adminList.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!messengerHeader.contains(e.target)) {
        adminList.style.display = 'none';
      }
    });
  }

  document.querySelectorAll('.admin-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent click from bubbling up
      selectedAdminId = parseInt(this.getAttribute('data-id'));
      const admin = allAdmins.find(a => a.id === selectedAdminId);
      selector.textContent = admin ? `${admin.first_name} ${admin.last_name}` : 'Select Admin';
      adminList.style.display = 'none';
      fetchConversation(userId, selectedAdminId);
    });

    item.addEventListener('mouseenter', () => item.style.backgroundColor = '#0147A1'); // Match button hover
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
    tempId: tempId
  };

  try {
    const apiResponse = await apiService.sendMessage(messageRequest);
    if (!apiResponse.success) {
      showToast("Failed to send message");
      fetchConversation(userId, selectedAdminId);
    }
    
  } catch (error) {
    console.error("Error sending message:", error);
    showToast(error.message.includes("Unauthorized") ? 
      "Session expired. Please log in again." : `Network error: ${error.message}`);
    fetchConversation(userId, selectedAdminId);
  }
}

function addLocalMessage(text) {
  const tempId = `temp-${Date.now()}`;
  const tempMessage = {
    tempId: tempId,
    sender_id: userId,
    receiver_id: selectedAdminId,
    message: text,
    timestamp: new Date().toISOString(),
    status: "sent",
    is_read: 0
  };

  pendingMessages.set(tempId, tempMessage);
  messagesList.push(tempMessage);
  renderMessages();
  toggleEmptyState();
  scrollToBottom();
  return tempId;
}

function displayReceivedMessage(messageData) {
  if (!document.querySelector(`[data-message-id="${messageData.id}"]`)) {
    messagesList.push(messageData);
    renderMessages();
    toggleEmptyState();
    scrollToBottom();
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
    } else {
      showToast("Failed to load conversation");
    }
  } catch (error) {
    console.error("Error fetching conversation:", error);
    showToast("Error loading conversation");
  }
}

function getUserId() {
  const storedId = localStorage.getItem('userId');
  return storedId ? parseInt(storedId) : -1;
}

function getAuthToken() {
  return localStorage.getItem('authToken');
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
      </div>
    `;
    messageList.appendChild(li);
  });
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

function initializeApp() {
  userId = getUserId();
  authToken = getAuthToken();

  if (userId === -1 || !authToken) {
    showToast("Please log in to use the chat feature");
    return;
  }

  document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  const sendButton = document.getElementById('btn_send');
  if (sendButton) sendButton.addEventListener('click', sendMessage);

  const messengerHeader = document.querySelector('.messenger-header');
  if (messengerHeader) {
    messengerHeader.textContent = 'Chat with ';
    if (!document.getElementById('connectionStatus')) {
      const statusDiv = document.createElement('div');
      statusDiv.id = 'connectionStatus';
      statusDiv.className = 'status-disconnected';
      statusDiv.textContent = 'Disconnected';
      messengerHeader.appendChild(statusDiv);
    }
  }

  const messengerBody = document.getElementById('messengerBody');
  if (messengerBody && !document.getElementById('noMessageIcon')) {
    const noMessageDiv = document.createElement('div');
    noMessageDiv.id = 'noMessageIcon';
    noMessageDiv.innerHTML = '<i class="fas fa-comments"></i>';
    noMessageDiv.style.cssText = `
      display: none;
      text-align: center;
      font-size: 24px;
      color: #757575;
      margin-top: 20px;
    `;
    messengerBody.appendChild(noMessageDiv);

    const startConvoDiv = document.createElement('div');
    startConvoDiv.id = 'startConvoTV';
    startConvoDiv.textContent = 'Start a conversation';
    startConvoDiv.style.cssText = `
      display: none;
      text-align: center;
      color: #757575;
      margin-top: 10px;
    `;
    messengerBody.appendChild(startConvoDiv);
  }

  connectWebSocket(userId);
  fetchAdmins(); // Fetch admins on load
}


document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    userId = getUserId();
    authToken = getAuthToken();
    reconnectIfNeeded();
    if (selectedAdminId) fetchConversation(userId, selectedAdminId); // Refresh on visibility
  }
});

window.addEventListener('beforeunload', closeConnection);

document.addEventListener('DOMContentLoaded', initializeApp);