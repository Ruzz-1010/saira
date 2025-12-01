const API_URL = 'https://hotel-booking-api-r3ho.onrender.com/api';

let selectedRoom = null;

// Load available rooms
async function loadAvailableRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const rooms = await response.json();
        
        const roomsContainer = document.getElementById('availableRooms');
        const roomSelect = document.getElementById('roomSelect');
        
        if (roomsContainer) {
            roomsContainer.innerHTML = rooms.map(room => `
                <div class="room-option" onclick="selectRoom('${room._id}')" id="room-${room._id}">
                    <h4>${room.name}</h4>
                    <p>${room.description.substring(0, 100)}...</p>
                    <div class="room-price">
                        Single: ₱${room.pricePerNight?.single || 'N/A'} | 
                        Double: ₱${room.pricePerNight?.double || 'N/A'}
                    </div>
                </div>
            `).join('');
        }
        
        if (roomSelect) {
            roomSelect.innerHTML = '<option value="">Select a room</option>' +
                rooms.map(room => 
                    `<option value="${room._id}">${room.name}</option>`
                ).join('');
        }
        
        // Check if room ID is in URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            selectRoom(roomId);
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Select a room
function selectRoom(roomId) {
    selectedRoom = roomId;
    
    // Highlight selected room
    document.querySelectorAll('.room-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.getElementById(`room-${roomId}`)?.classList.add('selected');
    
    // Update room select
    document.getElementById('roomSelect').value = roomId;
    
    // Load room details and update price
    loadRoomDetails(roomId);
}

// Load room details
async function loadRoomDetails(roomId) {
    try {
        const response = await fetch(`${API_URL}/rooms/${roomId}`);
        const room = await response.json();
        
        updatePrice(room);
    } catch (error) {
        console.error('Error loading room details:', error);
    }
}

// Update price based on room selection and dates
function updatePrice(room) {
    const roomType = document.getElementById('roomType').value;
    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);
    
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    let pricePerNight = 0;
    if (roomType === 'single' && room.pricePerNight?.single) {
        pricePerNight = room.pricePerNight.single;
    } else if (roomType === 'double' && room.pricePerNight?.double) {
        pricePerNight = room.pricePerNight.double;
    } else {
        pricePerNight = room.pricePerNight || 0;
    }
    
    const totalPrice = pricePerNight * nights;
    
    document.getElementById('roomRate').textContent = `₱${pricePerNight}`;
    document.getElementById('nights').textContent = nights;
    document.getElementById('totalPrice').textContent = `₱${totalPrice}`;
}

// Booking form submission
document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedRoom) {
        alert('Please select a room');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        contactNumber: document.getElementById('phone').value,
        roomId: selectedRoom,
        roomType: document.getElementById('roomType').value,
        checkInDate: document.getElementById('checkIn').value,
        checkOutDate: document.getElementById('checkOut').value,
        numberOfGuests: parseInt(document.getElementById('guests').value),
        paymentMethod: document.getElementById('payment').value,
        specialRequests: document.getElementById('specialRequests').value
    };
    
    try {
        const response = await fetch(`${API_URL}/bookings/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show confirmation modal
            document.getElementById('bookingId').textContent = data.bookingId;
            document.getElementById('confirmationModal').style.display = 'flex';
            
            // Reset form
            document.getElementById('bookingForm').reset();
        } else {
            alert(data.message || 'Booking failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('An error occurred during booking');
    }
});

// Close confirmation modal
function closeConfirmation() {
    document.getElementById('confirmationModal').style.display = 'none';
    window.location.href = 'index.html';
}

// Add event listeners for price updates
document.getElementById('roomType')?.addEventListener('change', () => {
    if (selectedRoom) loadRoomDetails(selectedRoom);
});

document.getElementById('checkIn')?.addEventListener('change', () => {
    if (selectedRoom) loadRoomDetails(selectedRoom);
});

document.getElementById('checkOut')?.addEventListener('change', () => {
    if (selectedRoom) loadRoomDetails(selectedRoom);
});

// Set minimum date for check-in to today
window.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').min = today;
    
    // Update check-out min date when check-in changes
    document.getElementById('checkIn').addEventListener('change', function() {
        document.getElementById('checkOut').min = this.value;
    });
    
    loadAvailableRooms();
    
    // Close modal functionality
    document.querySelector('.close')?.addEventListener('click', closeConfirmation);
});