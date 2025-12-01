const API_URL = 'http://localhost:5000/api';

// Load all rooms
async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const rooms = await response.json();
        
        const roomsContainer = document.getElementById('roomsContainer');
        if (roomsContainer) {
            roomsContainer.innerHTML = rooms.map(room => `
                <div class="room-card">
                    <div class="room-image">
                        <img src="${room.photos?.[0] || 'https://via.placeholder.com/300x200'}" alt="${room.name}">
                    </div>
                    <div class="room-info">
                        <h3>${room.name}</h3>
                        <p class="room-type">${room.roomType.toUpperCase()} ROOM</p>
                        <p>${room.description}</p>
                        
                        <div class="amenities">
                            <h4>Amenities:</h4>
                            ${room.amenities?.map(amenity => 
                                `<span class="amenity-tag">${amenity}</span>`
                            ).join('')}
                        </div>
                        
                        <div class="facilities">
                            <h4>Facilities:</h4>
                            ${room.facilities?.map(facility => 
                                `<span class="facility-tag">${facility}</span>`
                            ).join('')}
                        </div>
                        
                        <div class="price-section">
                            <div class="price">
                                Single: ₱${room.pricePerNight?.single || 'N/A'}
                            </div>
                            <div class="price">
                                Double: ₱${room.pricePerNight?.double || 'N/A'}
                            </div>
                        </div>
                        
                        <div class="room-actions">
                            <a href="booking.html?room=${room._id}" class="btn">Book Now</a>
                            <button class="btn secondary" onclick="viewRoomDetails('${room._id}')">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Search rooms based on dates and guests
async function searchRooms() {
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    const guests = document.getElementById('guestCount').value;
    
    if (!checkIn || !checkOut) {
        alert('Please select both check-in and check-out dates');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/rooms/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                checkIn,
                checkOut,
                guests: parseInt(guests)
            })
        });
        
        const rooms = await response.json();
        displaySearchResults(rooms);
    } catch (error) {
        console.error('Error searching rooms:', error);
    }
}

// Display search results
function displaySearchResults(rooms) {
    const roomsContainer = document.getElementById('roomsContainer');
    if (rooms.length === 0) {
        roomsContainer.innerHTML = `
            <div class="no-rooms">
                <h3>No rooms available for selected dates</h3>
                <p>Please try different dates or contact us for assistance.</p>
            </div>
        `;
    } else {
        roomsContainer.innerHTML = rooms.map(room => `
            <div class="room-card">
                <div class="room-image">
                    <img src="${room.photos?.[0] || 'https://via.placeholder.com/300x200'}" alt="${room.name}">
                </div>
                <div class="room-info">
                    <h3>${room.name}</h3>
                    <p>Max Guests: ${room.maxGuests}</p>
                    <div class="price">
                        From ₱${Math.min(room.pricePerNight?.single || Infinity, room.pricePerNight?.double || Infinity)}/night
                    </div>
                    <a href="booking.html?room=${room._id}" class="btn">Book Now</a>
                </div>
            </div>
        `).join('');
    }
}

// View room details
function viewRoomDetails(roomId) {
    // In a real app, you might show a modal with detailed information
    window.location.href = `booking.html?room=${roomId}`;
}

// Load rooms when page loads
window.addEventListener('DOMContentLoaded', loadRooms);