const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// =============================================
// BAGONG DATABASE NAME LANG!
// =============================================
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/grandstay_hotels?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB: grandstay_hotels'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// =============================================
// SAME SCHEMAS - WALANG BAGO!
// =============================================
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
    name: String,
    description: String,
    type: String,
    price: Number,
    amenities: [String],
    maxGuests: Number,
    images: [String],
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    roomId: String,
    roomName: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    totalAmount: Number,
    status: { type: String, default: 'pending' },
    specialRequests: String,
    createdAt: { type: Date, default: Date.now }
});

// =============================================
// SAME MODELS - WALANG BAGO!
// =============================================
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// =============================================
// CREATE ADMIN ACCOUNT
// =============================================
async function createAdmin() {
    try {
        const adminExists = await User.findOne({ email: 'admin@hotel.com' });
        if (!adminExists) {
            await User.create({
                name: 'Admin',
                email: 'admin@hotel.com',
                password: 'admin123',
                phone: '09123456789',
                role: 'admin'
            });
            console.log('✅ Admin created: admin@hotel.com / admin123');
        }
    } catch (error) {
        console.log('❌ Error creating admin:', error.message);
    }
}

// =============================================
// ROUTES - SAME LANG!
// =============================================

// Home
app.get('/', (req, res) => {
    res.json({ 
        message: '🏨 GrandStay Hotels API',
        status: 'OK',
        database: 'grandstay_hotels',
        collections: ['users', 'rooms', 'bookings'],
        admin: 'admin@hotel.com / admin123'
    });
});

// Test database
app.get('/api/test', async (req, res) => {
    try {
        const users = await User.countDocuments();
        const rooms = await Room.countDocuments();
        const bookings = await Booking.countDocuments();
        
        res.json({
            success: true,
            message: 'Database is working!',
            stats: {
                users,
                rooms,
                bookings
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// =============================================
// PUBLIC ROUTES
// =============================================

// Get all available rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({ isAvailable: true });
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get room by ID
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, checkIn, checkOut, guests, roomId, specialRequests } = req.body;
        
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
        
        const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        const totalAmount = room.price * nights;
        
        const booking = await Booking.create({
            customerName,
            customerEmail,
            customerPhone,
            roomId,
            roomName: room.name,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            guests: parseInt(guests),
            totalAmount,
            specialRequests
        });
        
        res.json({
            success: true,
            message: 'Booking successful!',
            bookingId: booking._id
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

// =============================================
// AUTHENTICATION ROUTES
// =============================================

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }
        
        const user = await User.create({ name, email, password, phone });
        
        res.json({
            success: true,
            message: 'Registration successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Admin login
app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const admin = await User.findOne({ email, role: 'admin' });
        
        if (!admin || admin.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
        
        res.json({
            success: true,
            message: 'Admin login successful',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// =============================================
// ADMIN ROUTES
// =============================================

// Admin: Get all rooms
app.get('/api/admin/rooms', async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Add room
app.post('/api/admin/rooms', async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.json({ success: true, message: 'Room added successfully', room });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add room' });
    }
});

// Admin: Update room
app.put('/api/admin/rooms/:id', async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, message: 'Room updated', room });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update room' });
    }
});

// Admin: Delete room
app.delete('/api/admin/rooms/:id', async (req, res) => {
    try {
        await Room.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Room deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete room' });
    }
});

// Admin: Get all bookings
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Update booking status
app.put('/api/admin/bookings/:id/status', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json({ success: true, message: 'Booking updated', booking });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update booking' });
    }
});

// Admin: Get all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Get stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalRooms = await Room.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const pendingBookings = await Booking.countDocuments({ status: 'pending' });
        const totalUsers = await User.countDocuments({ role: 'user' });
        
        res.json({
            success: true,
            stats: {
                totalRooms,
                totalBookings,
                pendingBookings,
                totalUsers
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// =============================================
// INITIALIZE ADMIN
// =============================================
createAdmin();

// =============================================
// START SERVER
// =============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`🏨 Database: grandstay_hotels`);
    console.log(`📊 Collections: users, rooms, bookings`);
    console.log(`🔑 Admin: admin@hotel.com / admin123`);
});