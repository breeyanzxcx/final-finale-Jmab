document.addEventListener("DOMContentLoaded", function () {
    initializeRating();
    initializeCustomAlert();
});

function initializeRating() {
    const rateButtons = document.querySelectorAll('.rate-btn');
    rateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const userId = this.getAttribute('data-user-id');
            const variantId = this.getAttribute('data-variant-id');
            openRatingModal(orderId, userId, variantId);
        });
    });

    const submitButton = document.getElementById('submitRating');
    if (submitButton) {
        submitButton.replaceWith(submitButton.cloneNode(true));
        document.getElementById('submitRating').addEventListener('click', submitRating);
    }

    const closeButton = document.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            document.getElementById('ratingModal').style.display = 'none';
        });
    }

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('ratingModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-value'));
            stars.forEach(s => s.classList.remove('active'));
            for (let i = 0; i < rating; i++) {
                stars[i].classList.add('active');
            }
            document.getElementById('ratingModal').setAttribute('data-rating', rating);
        });

        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-value'));
            stars.forEach(s => s.classList.remove('hover'));
            for (let i = 0; i < rating; i++) {
                stars[i].classList.add('hover');
            }
        });

        star.addEventListener('mouseout', function() {
            stars.forEach(s => s.classList.remove('hover'));
        });
    });

    const ratingModal = document.getElementById('ratingModal');
    if (ratingModal) {
        ratingModal.style.display = 'none';
    }
}

function initializeCustomAlert() {
    const alertPopup = document.getElementById('customAlertPopup');
    const alertOkButton = document.getElementById('customAlertOk');
    
    alertOkButton.addEventListener('click', function() {
        alertPopup.style.display = 'none';
    });

    // Override the default alert function
    window.alert = function(message) {
        const alertMessage = document.getElementById('customAlertMessage');
        alertMessage.textContent = message;
        alertPopup.style.display = 'flex';
    };
}

let onRatingSubmittedCallback = null;

function openRatingModal(orderId, userId, variantId, callback) {
    const modal = document.getElementById('ratingModal');
    if (!modal) {
        console.error('Rating modal not found in the DOM');
        return;
    }
    modal.style.display = 'flex';
    modal.setAttribute('data-order-id', orderId || '');
    modal.setAttribute('data-user-id', userId);
    modal.setAttribute('data-variant-id', variantId);
    modal.removeAttribute('data-rating');
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    onRatingSubmittedCallback = callback;
}

async function submitRating() {
    const modal = document.getElementById('ratingModal');
    const variantId = modal.getAttribute('data-variant-id');
    const userId = modal.getAttribute('data-user-id');
    const rating = modal.getAttribute('data-rating');

    console.log('Submitting rating with:', { variantId, userId, rating });

    if (!rating) {
        alert('Please select a rating.');
        return;
    }
    if (!variantId || isNaN(parseInt(variantId))) {
        alert('Error: Invalid or missing variant ID.');
        return;
    }
    if (!userId) {
        alert('Error: Missing user information.');
        return;
    }

    const submitButton = document.getElementById('submitRating');
    if (submitButton) {
        submitButton.disabled = true;
    }

    const payload = {
        variant_id: parseInt(variantId),
        user_id: parseInt(userId),
        rating: parseInt(rating)
    };
    console.log('Payload being sent:', payload);

    try {
        const response = await fetch('http://localhost/jmab/final-jmab/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            alert('Thank you for your rating!');
            modal.style.display = 'none';
            if (onRatingSubmittedCallback) {
                onRatingSubmittedCallback();
            }
            fetchUserOrders();
        } else {
            alert(`Failed to submit rating: ${data.errors ? data.errors.join(', ') : 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('An error occurred while submitting your rating.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

async function fetchProductRating(productId) {
    const response = await fetch(`http://localhost/jmab/final-jmab/api/ratings/${productId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });

    const data = await response.json();

    if (data.success) {
        const ratingDisplay = document.getElementById('ratingDisplay');
        if (ratingDisplay) {
            ratingDisplay.innerHTML = `
                <p>Average Rating: ${data.average_rating} (${data.rating_count} reviews)</p>
            `;
        }
    } else {
        console.error("Failed to fetch product rating:", data.message);
    }
}