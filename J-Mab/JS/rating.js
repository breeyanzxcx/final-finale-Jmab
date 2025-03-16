document.addEventListener("DOMContentLoaded", function () {
    // Initialize all rating functionality
    initializeRating();
});

function initializeRating() {
    // Set up rate buttons
    const rateButtons = document.querySelectorAll('.rate-btn');
    rateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const userId = this.getAttribute('data-user-id');
            const productId = this.getAttribute('data-product-id');
            console.log('Opening modal with:', { orderId, userId, productId });
            openRatingModal(orderId, userId, productId);
        });
    });

    // Set up submit button
    const submitButton = document.getElementById('submitRating');
    if (submitButton) {
        // Remove any existing event listeners (to be safe)
        submitButton.replaceWith(submitButton.cloneNode(true));
        // Get the fresh reference and add event listener
        document.getElementById('submitRating').addEventListener('click', submitRating);
    }

    // Set up modal close button
    const closeButton = document.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            document.getElementById('ratingModal').style.display = 'none';
        });
    }

    // Set up clicking outside modal to close
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('ratingModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Set up star rating system
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-value');
            stars.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('ratingModal').setAttribute('data-rating', rating);
        });
    });

    // Hide modal initially
    const ratingModal = document.getElementById('ratingModal');
    if (ratingModal) {
        ratingModal.style.display = 'none';
    }
}

function openRatingModal(orderId, userId, productId) {
    const modal = document.getElementById('ratingModal');
    if (!modal) {
        console.error('Rating modal not found in the DOM');
        return;
    }
    modal.style.display = 'flex';
    modal.setAttribute('data-order-id', orderId || '');
    modal.setAttribute('data-user-id', userId);
    modal.setAttribute('data-product-id', productId);
    modal.removeAttribute('data-rating');
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
}

async function submitRating() {
    const modal = document.getElementById('ratingModal');
    const productId = modal.getAttribute('data-product-id');
    const userId = modal.getAttribute('data-user-id');
    const rating = modal.getAttribute('data-rating');

    console.log('Submitting rating with:', { productId, userId, rating });

    if (!rating) {
        alert('Please select a rating.');
        return;
    }
    if (!productId || isNaN(parseInt(productId))) {
        alert('Error: Invalid or missing product ID.');
        return;
    }
    if (!userId) {
        alert('Error: Missing user information.');
        return;
    }

    // Disable submit button to prevent double submission
    const submitButton = document.getElementById('submitRating');
    if (submitButton) {
        submitButton.disabled = true;
    }

    const payload = {
        product_id: parseInt(productId),
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
            fetchUserOrders(); 
        } else {
            alert(`Failed to submit rating: ${data.errors ? data.errors.join(', ') : 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('An error occurred while submitting your rating.');
    } finally {
        // Re-enable submit button
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