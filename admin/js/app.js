// Main App Module
const App = {
    currentPage: 'dashboard',

    // Initialize app
    async init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setGreeting();

        // Load data
        await Shop.load();
        await Products.load();
        await Posts.load();
    },

    // Setup navigation
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                navigateTo(page);
            });
        });
    },

    // Setup mobile menu
    setupMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('menu-toggle');

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close on nav click (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                !sidebar.contains(e.target) &&
                !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    },

    // Set greeting based on time
    setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good evening!';

        if (hour < 12) greeting = 'Good morning!';
        else if (hour < 18) greeting = 'Good afternoon!';

        if (Auth.userData?.name) {
            greeting += ` ${Auth.userData.name}`;
        }

        document.getElementById('greeting').textContent = greeting;
    }
};

// Navigate to page
function navigateTo(page) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Show page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });

    App.currentPage = page;

    // Initialize map if shop page
    if (page === 'shop') {
        setTimeout(() => Shop.initMap(), 100);
    }
}

// Utility functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Analytics chart (placeholder)
function initAnalyticsChart() {
    const ctx = document.getElementById('views-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Views',
                data: [12, 19, 8, 25, 32, 28, 44],
                borderColor: '#C67C43',
                backgroundColor: 'rgba(198, 124, 67, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
