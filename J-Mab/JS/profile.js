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
              const updatedUser = { ...JSON.parse(localStorage.getItem('user')), ...userData };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              fetchUserProfile(userId);
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
              localStorage.setItem('user', JSON.stringify(data.user));
              loadProfileData();
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
        // Load profile picture if exists
        if (user.profile_picture) {
            document.getElementById('profilePic').src = user.profile_picture;
        }
    }
}

// Add this function to handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a .JPG or .PNG file');
        return;
    }

    // Check file size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
        alert('File size must not exceed 1MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result; // This is the Base64 string
        const previewImg = document.getElementById('profilePic');
        previewImg.src = base64Image;

        // Update profile with new image
        updateProfileImage(base64Image);
    };
    reader.readAsDataURL(file);
}

function updateProfileImage(base64Image) {
    const userId = JSON.parse(localStorage.getItem('user')).id;
    const token = localStorage.getItem('authToken');
    const userData = {
        profile_picture: base64Image
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
            // Update local storage
            const updatedUser = { ...JSON.parse(localStorage.getItem('user')), profile_picture: base64Image };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            fetchUserProfile(userId);
        } else {
            alert('Failed to update profile picture: ' + (data.errors?.join(', ') || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while uploading the image.");
    });
}

document.addEventListener('DOMContentLoaded', function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.id) {
      fetchUserProfile(user.id);
  } else {
      console.error('No user data found in localStorage');
  }
  // Add event listener for image upload
  document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
});

function showSuccessPopup() {
  const popup = document.getElementById('successPopup');
  popup.style.display = 'block';
  setTimeout(() => {
      popup.style.opacity = '1';
  }, 10);
  setTimeout(() => {
      popup.style.opacity = '0';
      setTimeout(() => {
          popup.style.display = 'none';
      }, 300);
  }, 2000);
}