<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>J-MAB</title>
  <link rel="stylesheet" href="../CSS/sign-in.css">
  <link rel="icon" type="image/x-icon" href="../imahe/jmab no bg.png">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    #forgot-password-link {
      color: black;
    }
    .modal { 
      display: none; 
      position: fixed; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      background: rgba(0, 0, 0, 0.5); 
      justify-content: center; 
      align-items: center; 
    }
    .modal-content { 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      width: 300px; 
      text-align: center; 
    }
    .modal-content input { 
      width: 100%; 
      padding: 8px; 
      margin: 10px 0; 
    }
    .modal-content button { 
      padding: 10px; 
      width: 100%; 
      background-color: #02254B; /* Updated to match brand color */
      color: white; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer; 
    }
    .modal-content button:hover { 
      background-color: #034078; /* Hover state matching popup */
    }
    #forgot-email {
      width: 90%;
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="logo-container">
      <img src="../imahe/j-mab.png" alt="J-MAB Logo">
      <span>J-MAB</span>
    </div> 
  </nav>
  <div class="container">
    <div class="left-section">
      <img src="../imahe/j-mab.png" alt="J-MAB Logo" class="logo">
      <h2>Your Expert Partner<br>for Tires and Batteries</h2>
    </div>

    <div class="right-section">
      <div class="form-container">
        <h2>Sign In</h2>
        <div class="welcome-container">
          <h5>WELCOME BACK!</h5>
          <p>Login your account</p>
        </div>

        <form id="signin-form">
          <div class="input-group">
            <label for="email">
              <img src="../imahe/Email.png" alt="Email Icon"><i class="icon email-icon"></i>
            </label>
            <input type="email" name="email" id="email" placeholder="Email" required>
          </div>

          <div class="input-group">
            <label for="password">
              <img src="../imahe/Lock 04.png" alt="Password Icon"><i class="icon password-icon"></i>
            </label>
            <input type="password" name="password" id="password" placeholder="Password" required>
          </div>

          <div class="checkbox-group">
            <input type="checkbox" id="show-password">
            <label for="show-password">Show Password</label>
          </div>

          <button type="submit" class="signin-btn">Sign In</button>
        </form>       
        <p><a href="#" id="forgot-password-link">Forgot Password?</a></p>
        <p class="signup-link">Doesn't have an account? 
          <a href="../HTML/sign-up.php">Sign Up</a>
        </p>
      </div>
    </div>
  </div>

  <!-- Forgot Password Modal -->
  <div id="forgot-password-modal" class="modal">
    <div class="modal-content">
      <h3>Forgot Password</h3>
      <form id="forgot-password-form">
        <input type="email" id="forgot-email" placeholder="Enter your email" required>
        <button type="submit">Send Reset Code</button>
      </form>
    </div>
  </div>

  <!-- Reset Password Modal -->
  <div id="reset-password-modal" class="modal">
    <div class="modal-content">
      <h3>Reset Password</h3>
      <form id="reset-password-form">
        <input type="text" id="reset-code" placeholder="6-Digit Code" maxlength="6" required>
        <input type="password" id="new-password" placeholder="New Password" required>
        <button type="submit">Reset Password</button>
      </form>
    </div>
  </div>

  <!-- Custom Popup -->
  <div id="custom-popup" class="popup-overlay">
    <div class="popup-content">
      <p id="popup-message"></p>
      <div class="popup-buttons">
        <button class="popup-ok" onclick="closePopup(true)">OK</button>
        <button class="popup-cancel" onclick="closePopup(false)">Cancel</button>
      </div>
    </div>
  </div>

  <script>
    // Popup handling functions
    function showPopup(message, callback) {
      const popup = document.getElementById('custom-popup');
      const messageElement = document.getElementById('popup-message');
      messageElement.textContent = message;
      popup.style.display = 'block';
      
      setTimeout(() => {
        popup.classList.add('active');
      }, 10);
      
      popup.dataset.callback = callback ? callback.name : '';
      return new Promise((resolve) => {
        popup.dataset.resolve = resolve;
      });
    }

    function closePopup(result) {
      const popup = document.getElementById('custom-popup');
      popup.classList.remove('active');
      
      setTimeout(() => {
        popup.style.display = 'none';
        const resolve = popup.dataset.resolve;
        if (resolve) {
          window[resolve](result);
        }
      }, 300);
    }

    document.getElementById("show-password").addEventListener("change", function () {
      const passwordInput = document.getElementById("password");
      passwordInput.type = this.checked ? "text" : "password";
    });

    document.getElementById('signin-form').addEventListener('submit', async function(event) {
      event.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.success && data.user) {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('userId', data.user.id);
          if (data.user.roles === 'admin') {
            window.location.href = '../../admin-jmab/dashboard.html';
          } else if (data.user.roles === 'customer') {
            window.location.href = 'home.html';
          } else {
            await showPopup('Unknown role: ' + data.user.roles);
          }
        } else {
          await showPopup("Login failed: " + (data.errors ? data.errors[0] : "Invalid credentials"));
        }
      } catch (error) {
        console.error('Error:', error);
        await showPopup("An error occurred. Please try again.");
      }
    });

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const resetPasswordModal = document.getElementById('reset-password-modal');

    forgotPasswordLink.addEventListener('click', function(event) {
      event.preventDefault();
      forgotPasswordModal.style.display = 'flex';
    });

    window.addEventListener('click', function(event) {
      if (event.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none';
      if (event.target === resetPasswordModal) resetPasswordModal.style.display = 'none';
    });

    document.getElementById('forgot-password-form').addEventListener('submit', async function(event) {
      event.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      console.log('Sending email:', email);

      if (!email) {
        await showPopup('Please enter an email address.');
        return;
      }

      try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/users/forgotPassword', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        console.log('Forgot Password API Response:', data);
        if (data.success) {
          await showPopup('A reset code has been sent to your email.');
          forgotPasswordModal.style.display = 'none';
          resetPasswordModal.style.display = 'flex';
          document.getElementById('reset-password-form').dataset.email = email;
        } else {
          await showPopup('Error: ' + (data.errors ? data.errors[0] : 'Could not send reset code.'));
        }
      } catch (error) {
        console.error('Error:', error);
        await showPopup('An error occurred. Please try again.');
      }
    });

    document.getElementById('reset-password-form').addEventListener('submit', async function(event) {
      event.preventDefault();
      const email = this.dataset.email;
      const resetCode = document.getElementById('reset-code').value.trim();
      const newPassword = document.getElementById('new-password').value;

      if (resetCode.length !== 6 || !/^\d{6}$/.test(resetCode)) {
        await showPopup('Please enter a valid 6-digit code.');
        return;
      }
      if (newPassword.length < 6) {
        await showPopup('New password must be at least 6 characters long.');
        return;
      }

      try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/users/resetPassword', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reset_code: resetCode, new_password: newPassword })
        });
        const data = await response.json();
        console.log('Reset Password API Response:', data);
        if (data.success) {
          await showPopup('Password reset successfully! You can now sign in with your new password.');
          resetPasswordModal.style.display = 'none';
        } else {
          await showPopup('Error: ' + (data.errors ? data.errors[0] : 'Invalid or expired reset code.'));
        }
      } catch (error) {
        console.error('Error:', error);
        await showPopup('An error occurred. Please try again.');
      }
    });
  </script>
</body>
</html>