const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to YOUR MongoDB
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/hotel_booking?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// Simple test route
app.get('/', (req, res) => {
    res.json({ message: 'Hotel Booking API is LIVE!' });
});

// Get rooms
app.get('/api/rooms', (req, res) => {
    const rooms = [
        {
            id: '1',
            name: 'Deluxe Room',
            price: 2500,
            type: 'double',
            amenities: ['Free WiFi', 'AC', 'TV']
        },
        {
            id: '2',
            name: 'Executive Suite',
            price: 3500,
            type: 'double',
            amenities: ['Free WiFi', 'AC', 'TV', 'Mini Bar']
        }
    ];
    res.json(rooms);
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const booking = req.body;
    console.log('New booking:', booking);
    
    // Save to MongoDB later
    res.json({
        success: true,
        message: 'Booking successful!',
        bookingId: 'BK-' + Date.now()
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}`);
});