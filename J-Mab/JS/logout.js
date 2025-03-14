// logout.js
document.addEventListener("DOMContentLoaded", function () {
    console.log("Logout script loaded successfully");

    const logoutButton = document.getElementById("logout");
    const logoutPopup = document.getElementById("logoutPopup");
    const confirmLogout = document.getElementById("confirmLogout");
    const cancelLogout = document.getElementById("cancelLogout");

    // Check if elements are found
    console.log("Logout Button:", logoutButton);
    console.log("Logout Popup:", logoutPopup);
    console.log("Confirm Button:", confirmLogout);
    console.log("Cancel Button:", cancelLogout);

    if (logoutButton && logoutPopup && confirmLogout && cancelLogout) {
        // Show popup when logout is clicked
        logoutButton.addEventListener("click", function (e) {
            e.preventDefault();
            console.log("Logout button clicked, showing popup");
            logoutPopup.style.display = "flex";
        });

        // Confirm logout
        confirmLogout.addEventListener("click", function () {
            console.log("Confirm logout clicked");
            localStorage.removeItem("authToken");
            localStorage.removeItem("userId");
            sessionStorage.clear();

            logoutPopup.style.display = "none";
            console.log("Popup hidden, showing success notification");

            const successDiv = document.createElement("div");
            successDiv.className = "popup";
            successDiv.innerHTML = `
                <div class="popup-content">
                    <h3>Success</h3>
                    <p>You have been logged out successfully!</p>
                </div>
            `;
            document.body.appendChild(successDiv);
            successDiv.style.display = "flex";

            setTimeout(() => {
                console.log("Redirecting to sign-in page");
                document.body.removeChild(successDiv);
                window.location.href = "../HTML/sign-in.php";
            }, 1500);
        });

        // Cancel logout
        cancelLogout.addEventListener("click", function () {
            console.log("Cancel logout clicked");
            logoutPopup.style.display = "none";
        });

        // Close popup if clicking outside
        logoutPopup.addEventListener("click", function (e) {
            if (e.target === logoutPopup) {
                console.log("Clicked outside popup, closing");
                logoutPopup.style.display = "none";
            }
        });
    } else {
        console.error("One or more elements not found. Check HTML IDs and script loading.");
    }
});