document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById('logout');
    const profileImageUpload = document.getElementById('profileImageUpload');

    // Custom Modal Functions
    function showCustomModal(title, message, onConfirm) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');
        const modalClose = document.querySelector('.modal-close');

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';

        const newConfirmBtn = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);
        document.getElementById('modalConfirm').addEventListener('click', function() {
            onConfirm();
            hideCustomModal();
        });

        modalCancel.addEventListener('click', hideCustomModal);
        modalClose.addEventListener('click', hideCustomModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) hideCustomModal();
        });
    }

    function hideCustomModal() {
        const modal = document.getElementById('customModal');
        modal.style.display = 'none';
    }

    // Authentication check
    const authToken = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!authToken || !user || !user.id) {
        showCustomModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        );
        return;
    }

    // Logout functionality with custom modal
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showCustomModal('Logout Confirmation', 'Are you sure you want to log out?', 
                function() {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userId');
                    window.location.href = '../J-Mab/HTML/sign-in.php';
                }
            );
        });
    }

    // Fetch and load admin profile data
    fetchAdminProfile(user.id);

    // Handle profile image upload
    if (profileImageUpload) {
        profileImageUpload.addEventListener('change', handleImageUpload);
    }
});

// Fetch admin profile data from the API
function fetchAdminProfile(userId) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showCustomModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        );
        return;
    }

    fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            loadAdminProfileData();
        } else {
            console.error('Failed to fetch admin profile:', data.message);
            showCustomModal('Error', 'Failed to fetch profile data: ' + (data.message || 'Unknown error'), 
                function() {}
            );
        }
    })
    .catch(error => {
        console.error('Error fetching admin profile:', error);
        showCustomModal('Error', 'An error occurred while fetching your profile: ' + error.message, 
            function() {}
        );
    });
}

// Load admin profile data into the UI
function loadAdminProfileData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('adminName').textContent = `${user.first_name} ${user.last_name}`;
        
        document.getElementById('firstNameValue').textContent = user.first_name || '';
        document.getElementById('lastNameValue').textContent = user.last_name || '';
        document.getElementById('emailValue').textContent = user.email || '';
        document.getElementById('genderValue').textContent = user.gender || 'Not Set';
        document.getElementById('birthdayValue').textContent = user.birthday || 'Not Set';
        
        document.getElementById('usernameValue').textContent = user.email || '';
        document.getElementById('passwordValue').textContent = '••••••••';
        
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
        showCustomModal('Invalid File', 'Please select a .JPG or .PNG file.', function() {});
        return;
    }

    if (file.size > 1048576) {
        showCustomModal('File Too Large', 'File size must not exceed 1MB.', function() {});
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

    if (!token) {
        showCustomModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        );
        return;
    }

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
            showCustomModal('Update Failed', 'Failed to update profile picture: ' + (data.errors?.join(', ') || 'Unknown error'), 
                function() {}
            );
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showCustomModal('Error', 'An error occurred while uploading the image: ' + error.message, 
            function() {}
        );
    });
}

// Placeholder for change password popup
function openChangePasswordPopup() {
    showCustomModal('Function Not Implemented', 'This feature is not yet available.', function() {});
}