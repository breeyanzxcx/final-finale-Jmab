<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>J-MAB</title>
  <link rel="stylesheet" href="../CSS/sign-up.css">
  <link rel="icon" type="image/x-icon" href="../imahe/jmab no bg.png">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;600&display=swap" rel="stylesheet">
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
        <h2>Sign Up</h2>
        <div class="welcome-container">
          <h5>WELCOME!</h5>
          <p>Create your account</p>
        </div>

        <!-- Signup Form -->
        <form id="signup-form">
          <div class="input-group">
            <label for="first-name">
              <img src="../imahe/User Profile 02.png" alt="Profile Icon"><i class="icon user-icon"></i>
            </label>
            <input type="text" name="fName" id="fName" placeholder="First Name" required>
            <input type="text" name="lName" id="lName" placeholder="Last Name" required>
          </div>

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
          <button type="submit" class="signup-btn">Sign Up</button>
        </form>

        <!-- Verification Section (Hidden Initially) -->
        <div id="verification-section" style="display: none;">
          <h5>VERIFY YOUR EMAIL</h5>
          <p>Enter the 6-digit code sent to your email</p>
          <form id="verify-form">
            <div class="input-group">
              <input type="text" id="verification-code" name="code" placeholder="6-Digit Code" maxlength="6" required>
            </div>
            <button type="submit" class="signup-btn">Verify</button>
          </form>
          <p>Didn't receive a code? <a href="#" id="resend-code">Resend</a></p>
        </div>

        <p class="signin-link">Already have an account? <a href="../HTML/sign-in.php">Sign In</a></p>
      </div>
    </div>
  </div>

  <!-- Custom Popup Container -->
  <div id="custom-popup" class="popup-overlay" style="display: none;">
    <div class="popup-content">
      <p id="popup-message"></p>
      <div class="popup-buttons">
        <button id="popup-ok" class="popup-btn">OK</button>
        <button id="popup-cancel" class="popup-btn cancel">Cancel</button>
      </div>
    </div>
  </div>

  <script>
    // Custom Popup Functions
    function showPopup(message, showCancel = false, callback = null) {
      const popup = document.getElementById('custom-popup');
      const messageElement = document.getElementById('popup-message');
      const cancelBtn = document.getElementById('popup-cancel');
      
      messageElement.textContent = message;
      popup.style.display = 'flex';
      cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

      return new Promise((resolve) => {
        document.getElementById('popup-ok').onclick = () => {
          popup.style.display = 'none';
          resolve(true);
          if (callback) callback(true);
        };
        
        document.getElementById('popup-cancel').onclick = () => {
          popup.style.display = 'none';
          resolve(false);
          if (callback) callback(false);
        };
      });
    }

    // Show/Hide Password
    document.getElementById("show-password").addEventListener("change", function () {
      const passwordInput = document.getElementById("password");
      passwordInput.type = this.checked ? "text" : "password";
    });

    // Capitalize Names
    function capitalizeInput(input) {
      input.value = input.value.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    document.getElementById('fName').addEventListener('input', function () {
      capitalizeInput(this);
    });
    document.getElementById('lName').addEventListener('input', function () {
      capitalizeInput(this);
    });

    // Signup Form Submission
    document.getElementById('signup-form').addEventListener('submit', async function(event) {
      event.preventDefault();

      const fName = document.getElementById('fName').value.trim();
      const lName = document.getElementById('lName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      const namePattern = /^[A-Z][a-zA-Z]*$/;
      if (!namePattern.test(fName)) {
        await showPopup("First name must start with a capital letter and contain only letters.");
        return;
      }
      if (!namePattern.test(lName)) {
        await showPopup("Last name must start with a capital letter and contain only letters.");
        return;
      }

      try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: fName,
            last_name: lName,
            email: email,
            password: password
          })
        });
        const data = await response.json();
        
        console.log('Register API Response:', data);
        if (data.success) {
          await showPopup('Registration successful! Please check your email for the verification code.');
          document.getElementById('signup-form').style.display = 'none';
          document.getElementById('verification-section').style.display = 'block';
          document.getElementById('verify-form').dataset.email = email;
        } else if (data.errors && data.errors[0] === "Email is already registered or pending verification.") {
          const resend = await showPopup(
            "This email is already registered or pending verification. Would you like us to resend the verification code?",
            true
          );
          
          if (resend) {
            const resendResponse = await fetch('http://localhost/jmab/final-jmab/api/users/resend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email })
            });
            const resendData = await resendResponse.json();
            
            if (resendData.success) {
              await showPopup('A new verification code has been sent to your email.');
              document.getElementById('signup-form').style.display = 'none';
              document.getElementById('verification-section').style.display = 'block';
              document.getElementById('verify-form').dataset.email = email;
            } else {
              await showPopup('Error: ' + (resendData.errors || 'Could not resend verification code.'));
            }
          }
        } else {
          await showPopup('Registration failed: ' + (data.errors || 'Please try again.'));
        }
      } catch (error) {
        console.error('Error:', error);
        await showPopup('An error occurred. Please try again.');
      }
    });

    // Verification Form Submission
    document.getElementById('verify-form').addEventListener('submit', async function(event) {
      event.preventDefault();

      const code = document.getElementById('verification-code').value.trim();
      const email = this.dataset.email;

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        await showPopup('Please enter a valid 6-digit code.');
        return;
      }

      try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/users/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            code: code
          })
        });
        const data = await response.json();
        
        console.log('Verify API Response:', data);
        if (data.success) {
          await showPopup('Email verified successfully! Redirecting to sign-in page.');
          window.location.href = '../HTML/sign-in.php';
        } else {
          await showPopup('Verification failed: ' + (data.errors || 'Invalid or expired code.'));
        }
      } catch (error) {
        console.error('Error:', error);
        await showPopup('An error occurred during verification. Please try again.');
      }
    });

    // Resend Verification Code
    document.getElementById('resend-code').addEventListener('click', async function(event) {
      event.preventDefault();
      const email = document.getElementById('verify-form').dataset.email;

      try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/users/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        const data = await response.json();
        
        if (data.success) {
          await showPopup('A new verification code has been sent to your email.');
        } else {
          await showPopup('Error: ' + (data.errors || 'Could not resend verification code.'));
        }
      } catch (error) {
        console.error('Error:', error);
        await showPopup('An error occurred. Please try again.');
      }
    });
  </script>
</body>
</html>