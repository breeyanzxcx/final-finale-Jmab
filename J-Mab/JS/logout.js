document.addEventListener("DOMContentLoaded", function () {
    console.log("Logout script loaded");

    const logoutButton = document.getElementById("logout");

    if (logoutButton) {
        logoutButton.addEventListener("click", function (e) {
            e.preventDefault();
            
            const isConfirmed = confirm("Are you sure you want to log out?");
            if (isConfirmed) {
                console.log("Logging out...");

                // Clear authentication data if applicable
                localStorage.removeItem("authToken");
                sessionStorage.removeItem("authToken");

                // Redirect to login page
                window.location.href = "../HTML/sign-in.php"; // Adjust if needed
            }
        });
    } else {
        console.error("Logout button not found.");
    }
});
