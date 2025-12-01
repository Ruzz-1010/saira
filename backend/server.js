const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://saira-three.vercel.app'
    ],
    credentials: true
}));

app.use(express.json());

// ============ DATABASE CONNECTION ============
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/hotel_booking?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// ============ SCHEMAS ============
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ['single', 'double', 'suite', 'family', 'presidential'] },
    price: { type: Number, required: true, min: 0 },
    amenities: [String],
    maxGuests: { type: Number, required: true, min: 1 },
    images: [String],
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
    specialRequests: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// ============ CREATE REAL ADMIN ON STARTUP ============
async function createRealAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@hotel.com' });
        
        if (!existingAdmin) {
            await User.create({
                name: 'SAIRA HOTEL ADMIN',
                email: 'admin@hotel.com',
                password: 'admin123',
                phone: '09123456789',
                role: 'admin'
            });
            console.log('✅ REAL ADMIN CREATED: admin@hotel.com / admin123');
        } else {
            console.log('✅ Admin already exists in database');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
}

createRealAdmin();

// ============ PUBLIC ROUTES ============

// Home route
app.get('/', (req, res) => {
    res.json({ 
        message: '🏨 SAIRA Hotel Booking API - REAL SYSTEM',
        status: 'Running',
        database: 'MongoDB Atlas',
        admin: 'REAL admin account required',
        endpoints: {
            rooms: 'GET /api/rooms',
            book: 'POST /api/bookings',
            admin_login: 'POST /api/auth/admin/login (REAL auth only)'
        }
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

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { 
            customerName, 
            customerEmail, 
            customerPhone, 
            checkIn, 
            checkOut, 
            guests, 
            roomId,
            specialRequests 
        } = req.body;

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
            message: 'Booking created successfully!',
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
        console.error('Booking error:', error);
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

// ============ REAL AUTHENTICATION ============

// REAL User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            phone: phone?.trim(),
            role: 'user'
        });

        res.status(201).json({
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

// REAL User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // REAL password check
        if (user.password !== password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// ============ REAL ADMIN AUTHENTICATION ============

// REAL Admin Login (NO DEMO MODE)
app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password required' 
            });
        }

        // Find user
        const user = await User.findOne({ 
            email: email.trim().toLowerCase() 
        });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin account not found' 
            });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required. This account is not an admin.' 
            });
        }

        // REAL password check
        if (user.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }

        // SUCCESS
        console.log(`✅ REAL Admin login: ${user.email}`);
        
        res.json({
            success: true,
            message: 'Admin login successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed. Please try again.' 
        });
    }
});

// ============ ADMIN MIDDLEWARE ============

const verifyAdmin = async (req, res, next) => {
    try {
        const { adminEmail } = req.query;
        
        if (!adminEmail) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin email required' 
            });
        }

        const user = await User.findOne({ 
            email: adminEmail.trim().toLowerCase(),
            role: 'admin' 
        });
        
        if (!user) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required. Please login again.' 
            });
        }

        req.admin = user;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Authentication failed' });
    }
};

// ============ ADMIN PROTECTED ROUTES ============

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

// Get all rooms (admin)
app.get('/api/admin/rooms', verifyAdmin, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add new room
app.post('/api/admin/rooms', verifyAdmin, async (req, res) => {
    try {
        const { name, description, type, price, amenities, maxGuests, images } = req.body;

        if (!name || !description || !type || !price || !maxGuests) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const room = await Room.create({
            name: name.trim(),
            description: description.trim(),
            type,
            price: Number(price),
            amenities: amenities || [],
            maxGuests: Number(maxGuests),
            images: images || [],
            isAvailable: true
        });

        res.status(201).json({
            success: true,
            message: 'Room added successfully!',
            room
        });

    } catch (error) {
        console.error('Add room error:', error);
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
            return res.status(404).json({ 
                success: false, 
                message: 'Room not found' 
            });
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
            return res.status(404).json({ 
                success: false, 
                message: 'Room not found' 
            });
        }

        res.json({
            success: true,
            message: 'Room deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete room' });
    }
});

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
            return res.status(404).json({ 
                success: false, 
                message: 'Booking not found' 
            });
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

// Get all users (admin)
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============ SERVER START ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`🔑 REAL ADMIN: admin@hotel.com / admin123`);
    console.log(`🎯 NO DEMO MODE - REAL AUTHENTICATION ONLY`);
});