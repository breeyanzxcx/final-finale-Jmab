function toggleMessenger(event) {
    event.preventDefault();
    const messengerBox = document.getElementById('messengerBox');
    messengerBox.style.display = messengerBox.style.display === 'block' ? 'none' : 'block';
  }
  
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageList = document.getElementById('messageList');
    const messageText = input.value.trim();
  
    if (messageText) {
      const li = document.createElement('li');
      li.classList.add('message-item', 'sent');
      li.innerHTML = `
        <div class="message-content">${messageText}<span class="message-timestamp">${getCurrentTime()}</span></div>
      `;
      messageList.appendChild(li);
  
      // Clear input
      input.value = '';
  
      // Auto-scroll to the bottom
      const messengerBody = document.getElementById('messengerBody');
      messengerBody.scrollTop = messengerBody.scrollHeight;
  
      // Simulate a reply
      simulateReply();
    }
  }
  
  function simulateReply() {
    const selectedContact = document.getElementById('contactSelect').value;
    const messageList = document.getElementById('messageList');
    let replyText = '';
  
    switch (selectedContact) {
      case 'support':
        replyText = 'Thank you for your message! How can we assist you?';
        break;
      case 'john':
        replyText = 'Hey! Good to hear from you.';
        break;
      case 'jane':
        replyText = 'Hi there! What’s up?';
        break;
      case 'mike':
        replyText = 'Hello! How can I help you today?';
        break;
    }
  
    setTimeout(() => {
      const li = document.createElement('li');
      li.classList.add('message-item');
      li.innerHTML = `
        <div class="message-content">${replyText}<span class="message-timestamp">${getCurrentTime()}</span></div>
      `;
      messageList.appendChild(li);
  
      const messengerBody = document.getElementById('messengerBody');
      messengerBody.scrollTop = messengerBody.scrollHeight;
    }, 1000); // Simulate a 1-second delay for the reply
  }
  
  function startNewChat() {
    const messageList = document.getElementById('messageList');
    const selectedContact = document.getElementById('contactSelect').value;
    let greetingText = '';
  
    // Clear existing messages
    messageList.innerHTML = '';
  
    // Set greeting based on selected contact
    switch (selectedContact) {
      case 'support':
        greetingText = 'Hello! How can we assist you today?';
        break;
      case 'john':
        greetingText = 'Hi! What’s on your mind, buddy?';
        break;
      case 'jane':
        greetingText = 'Hey! Nice to chat with you!';
        break;
      case 'mike':
        greetingText = 'Hello! What can I do for you?';
        break;
    }
  
    // Add greeting message with timestamp
    const li = document.createElement('li');
    li.classList.add('message-item');
    li.innerHTML = `
      <div class="message-content">${greetingText}<span class="message-timestamp">${getCurrentTime()}</span></div>
    `;
    messageList.appendChild(li);
  
    // Scroll to the bottom
    const messengerBody = document.getElementById('messengerBody');
    messengerBody.scrollTop = messengerBody.scrollHeight;
  }
  
  // Allow sending message with Enter key
  document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Handle contact selection change
  document.getElementById('contactSelect').addEventListener('change', function() {
    startNewChat();
  });
  
  // Initialize chat with the default contact on load
  document.addEventListener('DOMContentLoaded', function() {
    startNewChat();
  });