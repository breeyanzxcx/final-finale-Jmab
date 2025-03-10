<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In - J-MAB</title>
  <link rel="stylesheet" href="../CSS/sign-in.css">
  <link rel="icon" type="image/x-icon" href="../imahe/jmab no bg.png">
</head>

  <!--http://localhost/jmab/new_jmab/api/user/register-->

<body>
  <nav class="navbar">
    <div class="logo-container">
      <img src="../imahe/j-mab.png" alt="J-MAB Logo">
      <span>J-MAB</span>
    </div>
    <div class="help-link">
      <a href="#">Need Help?</a>
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
              <img src="../imahe/Email.png" alt="Email Icon"><i class="icon email-icon"></i></label>
            <input type="email" name="email" id="email" placeholder="Email" required>
          </div>

          <div class="input-group">
            <label for="password">
              <img src="../imahe/Lock 04.png" alt="Password Icon"><i class="icon password-icon"></i></label>
            <input type="password" name="password" id="password" placeholder="Password" required>
          </div>

          <div class="checkbox-group">
            <input type="checkbox" id="show-password">
            <label for="show-password">Show Password</label>
          </div>

          <button type="submit" class="signin-btn">Sign In</button>
        </form>       
        <p class="signup-link">Doesn't have an account? 
          <a href="../HTML/sign-up.php">Sign Up</p>
          </a>
      </div>
    </div>
  </div>
  
  <script>
    document.getElementById("show-password").addEventListener("change", function () {
    const passwordInput = document.getElementById("password");
    if (this.checked) {
      passwordInput.type = "text"; // Show password
    } else {
      passwordInput.type = "password"; // Hide password
    }
  });
  
  document.getElementById('signin-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost/jmab/final-jmab/api/users/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())  
    .then(data => {
        console.log('API Response:', data); 
        
        if (data.success && data.user) {
            localStorage.setItem('authToken', data.token);  // Save token
            localStorage.setItem('user', JSON.stringify(data.user));  // Store full user data
            
            console.log('User & Token saved:', data.user, data.token);

            // Redirect based on role
            if (data.user.roles === 'admin') {
                window.location.href = '../../admin-jmab/dashboard.html';
            } else if (data.user.roles === 'customer') {
                window.location.href = 'home.php';
            } else {
                alert('Unknown role: ' + data.user.roles);
            }
        } else {
            alert("Login failed: " + (data.errors ? data.errors[0] : "Invalid credentials"));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred. Please try again.");
    });
});
</script>
</body>
</html>
