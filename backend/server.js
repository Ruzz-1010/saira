const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://saira-three.vercel.app',
        'https://hotel-booking-api-r3ho.onrender.com'
    ],
    credentials: true
}));

app.use(express.json());

// Connect to YOUR MongoDB
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/hotel_booking?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
    name: String,
    description: String,
    type: { type: String, enum: ['single', 'double', 'suite', 'family', 'presidential'] },
    price: Number,
    amenities: [String],
    maxGuests: Number,
    images: [String], // IKAW MAGLALAGAY NG IMAGE URLs
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    totalAmount: Number,
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
    specialRequests: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

const JWT_SECRET = 'hotel-booking-secret-key-2024';

// Create admin user on startup
async function createAdmin() {
    try {
        const adminExists = await User.findOne({ email: 'admin@hotel.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'System Administrator',
                email: 'admin@hotel.com',
                password: hashedPassword,
                phone: '09123456789',
                role: 'admin'
            });
            console.log('✅ Admin user created: admin@hotel.com / admin123');
        }
    } catch (error) {
        console.error('Admin creation error:', error);
    }
}
createAdmin();

// ============ PUBLIC ROUTES ============

// Test API
app.get('/', (req, res) => {
    res.json({ 
        message: '🏨 Hotel Booking API',
        status: 'Running',
        database: 'MongoDB Atlas',
        admin: 'Login at /api/auth/admin/login'
    });
});

// Get all available rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({ isAvailable: true });
        res.json({
            success: true,
            count: rooms.length,
            rooms: rooms
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single room
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, phone });
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
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
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Invalid password' });
        }
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
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
        const user = await User.findOne({ email, role: 'admin' });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Admin not found' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Admin login successful',
            token,
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

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, checkIn, checkOut, guests, roomId, specialRequests } = req.body;
        
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const totalAmount = room.price * nights;
        
        const booking = await Booking.create({
            customerName,
            customerEmail,
            customerPhone,
            roomId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: parseInt(guests),
            totalAmount,
            specialRequests,
            status: 'pending'
        });
        
        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            bookingId: booking._id,
            booking: {
                id: booking._id,
                room: room.name,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                totalAmount: booking.totalAmount,
                status: booking.status
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

// ============ ADMIN ROUTES ============

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Admin dashboard stats
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const totalRooms = await Room.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const pendingBookings = await Booking.countDocuments({ status: 'pending' });
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalRevenue = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalRooms,
                totalBookings,
                pendingBookings,
                totalUsers,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============ ROOM MANAGEMENT (IKAW MAG-AADD) ============

// Get all rooms (admin - includes unavailable)
app.get('/api/admin/rooms', verifyAdmin, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add new room (IKAW MAGLALAGAY NG DETAILS)
app.post('/api/admin/rooms', verifyAdmin, async (req, res) => {
    try {
        const { name, description, type, price, amenities, maxGuests, images } = req.body;
        
        // Validation
        if (!name || !description || !type || !price || !maxGuests) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        const room = await Room.create({
            name,
            description,
            type,
            price: Number(price),
            amenities: amenities || [],
            maxGuests: Number(maxGuests),
            images: images || [],
            isAvailable: true
        });
        
        res.status(201).json({
            success: true,
            message: 'Room added successfully',
            room
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add room' });
    }
});

// Update room
app.put('/api/admin/rooms/:id', verifyAdmin, async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        res.json({
            success: true,
            message: 'Room updated successfully',
            room
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update room' });
    }
});

// Delete room
app.delete('/api/admin/rooms/:id', verifyAdmin, async (req, res) => {
    try {
        const room = await Room.findByIdAndDelete(req.params.id);
        
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        res.json({
            success: true,
            message: 'Room deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete room' });
    }
});

// ============ BOOKING MANAGEMENT ============

// Get all bookings (admin)
app.get('/api/admin/bookings', verifyAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('roomId', 'name price')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update booking status
app.put('/api/admin/bookings/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('roomId', 'name');
        
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        res.json({
            success: true,
            message: 'Booking status updated',
            booking
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update booking' });
    }
});

// ============ USER MANAGEMENT ============

// Get all users (admin)
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`🔑 Admin: admin@hotel.com / admin123`);
});