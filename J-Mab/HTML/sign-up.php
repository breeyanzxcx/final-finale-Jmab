<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up - J-MAB</title>
  <link rel="stylesheet" href="../CSS/sign-up.css">
  <link rel="icon" type="image/x-icon" href="../imahe/jmab no bg.png">
</head>

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
        <h2>Sign Up</h2>
        <div class="welcome-container">
          <h5>WELCOME!</h5>
          <p>Create your account</p>
        </div>

        <form id="signup-form">
          <div class="input-group">
            <label for="first-name">
              <img src="../imahe/User Profile 02.png" alt="Profile Icon"><i class="icon user-icon"></i></label>
            <input type="text" name="fName" id="fName" placeholder="First Name" required>
            <input type="text" name="lName" id="lName" placeholder="Last Name" required>
          </div>

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
          <button type="submit" class="signup-btn">Sign Up</button>
        </form>       
         
        <p class="signin-link">Already have an account?
           <a href="../HTML/sign-in.php">Sign In</p>
           </a>
    
      </div>
    </div>
  </div>
 
  <script> 
  document.getElementById("show-password").addEventListener("change", function () {
    const passwordInput = document.getElementById("password");
    if (this.checked) {
      passwordInput.type = "text"; 
    } else {
      passwordInput.type = "password"; 
    }
  });


function capitalizeInput(input) {
    input.value = input.value.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Attach event listeners to first name and last name inputs
document.getElementById('fName').addEventListener('input', function () {
    capitalizeInput(this);
});

document.getElementById('lName').addEventListener('input', function () {
    capitalizeInput(this);
});

document.getElementById('signup-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission if validation fails


    const fName = document.getElementById('fName').value.trim();
    const lName = document.getElementById('lName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Regular expression to check if the first letter is uppercase
    const namePattern = /^[A-Z][a-zA-Z]*$/;

    if (!namePattern.test(fName)) {
        alert("First name must start with a capital letter and contain only letters.");
        return;
    }

    if (!namePattern.test(lName)) {
        alert("Last name must start with a capital letter and contain only letters.");
        return;
    }

    fetch('http://localhost/jmab/final-jmab/api/users/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            first_name: fName,
            last_name: lName,
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('API Response:', data);

        if (data.success) {
            alert('Registration successful! Redirecting to login page.');
            window.location.href = 'sign-in.html'; 
        } else {
            alert('Registration failed: ' + (data.message || 'Please try again.'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    });
});
</script>
</body>
</html>
