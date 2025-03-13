function toggleDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
}

window.addEventListener('click', function (e) {
    const profileButton = document.querySelector('.profile-button');
    const dropdown = document.getElementById('profileDropdown');
    if (!profileButton.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
}
});

document.getElementById('editBtn').addEventListener('click', function () {
    const inputs = document.querySelectorAll('.profile-form input');
    inputs.forEach(input => input.removeAttribute('readonly'));
    document.querySelectorAll('.profile-form input[type="radio"]').forEach(radio => radio.removeAttribute('disabled'));
    document.getElementById('saveBtn').disabled = false;
    document.getElementById('saveBtn').classList.add('enabled');
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('editBtn').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', function () {
    loadProfileData();
    const inputs = document.querySelectorAll('.profile-form input');
    inputs.forEach(input => input.setAttribute('readonly', true));
    document.querySelectorAll('.profile-form input[type="radio"]').forEach(radio => radio.setAttribute('disabled', true));
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('saveBtn').classList.remove('enabled');
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('editBtn').style.display = 'inline-block';
});

document.getElementById('profileForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const userId = JSON.parse(localStorage.getItem('user')).id;
    const token = localStorage.getItem('authToken');
    const userData = {
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      phone_number: document.getElementById('phone').value,
      gender: document.querySelector('input[name="gender"]:checked').value,
      birthday: document.getElementById('birthday').value
};

fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
})
      .then(response => response.json())
      .then(data => {
        if (data.success) {
        showSuccessPopup();
          const inputs = document.querySelectorAll('.profile-form input');
          inputs.forEach(input => input.setAttribute('readonly', true));
          document.querySelectorAll('.profile-form input[type="radio"]').forEach(radio => radio.setAttribute('disabled', true));
          document.getElementById('saveBtn').disabled = true;
          document.getElementById('saveBtn').classList.remove('enabled');
          document.getElementById('cancelBtn').style.display = 'none';
          document.getElementById('editBtn').style.display = 'inline-block';
          // Update localStorage with new user data and reload
          const updatedUser = { ...JSON.parse(localStorage.getItem('user')), ...userData };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          fetchUserProfile(userId); // Fetch updated profile data
        } else {
          alert('Failed to update profile: ' + (data.errors?.join(', ') || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert("An error occurred. Please try again.");
    });
});

function fetchUserProfile(userId) {
    const token = localStorage.getItem('authToken');
    fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('user', JSON.stringify(data.user)); // Update localStorage with full user data
          loadProfileData(); // Update UI with fetched data
        } else {
          console.error('Failed to fetch user profile:', data.message);
        }
      })
    .catch(error => console.error('Error fetching user profile:', error));
}

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      document.getElementById('firstName').value = user.first_name || '';
      document.getElementById('lastName').value = user.last_name || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('phone').value = user.phone_number || '';
      document.getElementById('birthday').value = user.birthday || '';
      if (user.gender) {
        document.getElementById(user.gender.toLowerCase()).checked = true;
      }
    }
  }

  // Load full profile data on page load
document.addEventListener('DOMContentLoaded', function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
      fetchUserProfile(user.id); // Fetch full profile using user ID from login
    } else {
      console.error('No user data found in localStorage');
    }
});

function showSuccessPopup() {
    const popup = document.getElementById('successPopup');

    // Show popup with fade-in effect
    popup.style.display = 'block';
    setTimeout(() => {
        popup.style.opacity = '1';
    }, 10);

    // Hide popup after 3 seconds with fade-out effect
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
    }, 1000);
}