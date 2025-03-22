// Logout functionality
document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        });
    }

    // Fetch and load admin profile data on page load
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
        fetchAdminProfile(user.id);
    } else {
        console.error('No user data found in localStorage');
    }

    document.getElementById('profileImageUpload').addEventListener('change', handleImageUpload);
});

// Fetch admin profile data from the API
function fetchAdminProfile(userId) {
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
            loadAdminProfileData();
        } else {
            console.error('Failed to fetch admin profile:', data.message);
        }
    })
    .catch(error => console.error('Error fetching admin profile:', error));
}

// Load admin profile data into the UI
function loadAdminProfileData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('adminName').textContent = `${user.first_name} ${user.last_name}`;
        
        // Update personal information
        document.getElementById('firstNameValue').textContent = user.first_name || '';
        document.getElementById('lastNameValue').textContent = user.last_name || '';
        document.getElementById('emailValue').textContent = user.email || '';
        document.getElementById('genderValue').textContent = user.gender || 'Not Set';
        document.getElementById('birthdayValue').textContent = user.birthday || 'Not Set';
        
        document.getElementById('usernameValue').textContent = user.email || '';
        document.getElementById('passwordValue').textContent = '••••••••'; // Static masked value
        
        if (user.profile_picture) {
            document.getElementById('profileImage').src = user.profile_picture;
        }
    }
}

// Handle profile image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a .JPG or .PNG file');
        return;
    }

    if (file.size > 1048576) {
        alert('File size must not exceed 1MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        document.getElementById('profileImage').src = base64Image;
        updateProfileImage(base64Image);
    };
    reader.readAsDataURL(file);
}

// Update profile image on the server
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
            const updatedUser = { ...JSON.parse(localStorage.getItem('user')), profile_picture: base64Image };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            loadAdminProfileData();
            document.getElementById('successMessage').style.display = 'block';
            setTimeout(() => {
                document.getElementById('successMessage').style.display = 'none';
            }, 2000);
        } else {
            alert('Failed to update profile picture: ' + (data.errors?.join(', ') || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while uploading the image.');
    });
}

// Placeholder for change password popup
function openChangePasswordPopup() {
    alert('WALANG FUNCTION ITO.');
}