// API Base URL
const API_URL = 'http://localhost:5000/api';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const showRegister = document.getElementById('showRegister');
const closeButtons = document.querySelectorAll('.close');

// Open Login Modal
loginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'flex';
});

// Open Register Modal
registerBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.style.display = 'flex';
});

// Show Register form from Login
showRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    registerModal.style.display = 'flex';
});

// Close modals
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    });
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.style.display = 'none';
    if (e.target === registerModal) registerModal.style.display = 'none';
});

// Login Form Submission
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert('Login successful!');
            loginModal.style.display = 'none';
            updateNavForLoggedInUser(data.user);
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
});

// Register Form Submission
const registerForm = document.getElementById('registerForm');
registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = registerForm.querySelector('input[type="text"]').value;
    const email = registerForm.querySelector('input[type="email"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;
    const phone = registerForm.querySelector('input[type="tel"]').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, phone })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert('Registration successful!');
            registerModal.style.display = 'none';
            updateNavForLoggedInUser(data.user);
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration');
    }
});

// Update navigation for logged in user
function updateNavForLoggedInUser(user) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn && registerBtn) {
        loginBtn.textContent = `Welcome, ${user.name}`;
        registerBtn.textContent = 'Logout';
        registerBtn.onclick = logout;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user');
    if (user) {
        updateNavForLoggedInUser(JSON.parse(user));
    }
    
    // Load featured rooms on homepage
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/') {
        loadFeaturedRooms();
    }
});

// Load featured rooms
async function loadFeaturedRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const rooms = await response.json();
        
        const featuredRoomsContainer = document.getElementById('featuredRooms');
        if (featuredRoomsContainer) {
            // Show only first 3 rooms as featured
            const featuredRooms = rooms.slice(0, 3);
            
            featuredRoomsContainer.innerHTML = featuredRooms.map(room => `
                <div class="room-card">
                    <div class="room-image">
                        <img src="${room.photos?.[0] || 'https://via.placeholder.com/300x200'}" alt="${room.name}">
                    </div>
                    <div class="room-info">
                        <h3>${room.name}</h3>
                        <p>${room.description.substring(0, 100)}...</p>
                        <div class="amenities">
                            ${room.amenities?.slice(0, 3).map(amenity => 
                                `<span class="amenity-tag">${amenity}</span>`
                            ).join('')}
                        </div>
                        <div class="price">
                            ₱${room.pricePerNight?.single || room.pricePerNight || 0}/night
                        </div>
                        <a href="booking.html?room=${room._id}" class="btn">Book Now</a>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading featured rooms:', error);
    }
}