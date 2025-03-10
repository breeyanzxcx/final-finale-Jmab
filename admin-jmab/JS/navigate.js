function initializeNavigation() {
    const navItems = document.querySelectorAll('#sidebar .side-menu li');

    // Function to remove active class from all items
    function removeActiveClasses() {
        navItems.forEach(item => {
            item.classList.remove('active');
        });
    }

    // Add click event listener to each nav item
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Only prevent default for logout link
            if (this.id === 'logout') return;
            
            removeActiveClasses();
            this.classList.add('active');
            
            // Store the active item in localStorage
            localStorage.setItem('activeNav', this.querySelector('a').getAttribute('href'));
        });
    });

    // Set active class based on current URL or stored value
    const currentPath = window.location.pathname;
    const storedActiveNav = localStorage.getItem('activeNav');
    
    navItems.forEach(item => {
        const link = item.querySelector('a').getAttribute('href');
        if (link === currentPath || (storedActiveNav && link === storedActiveNav)) {
            removeActiveClasses();
            item.classList.add('active');
        }
    });
}