const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS - Allow your Vercel frontend
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://saira-three.vercel.app',
        'https://saira.vercel.app'
    ],
    credentials: true
}));

app.use(express.json());

// ============ USE YOUR OWN DATABASE ============
// I-chat mo 'saira_hotel_db' kung gusto mo ibang name
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/saira_hotel_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to SAIRA_HOTEL_DB Database!'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// ============ SCHEMAS ============
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
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    totalAmount: Number,
    status: { type: String, default: 'pending' },
    specialRequests: String,
    createdAt: { type: Date, default: Date.now }
});

// ============ MODELS ============
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// ============ CREATE ADMIN USER ON STARTUP ============
async function createAdminUser() {
    try {
        // Check if admin already exists
        const adminExists = await User.findOne({ email: 'admin@hotel.com' });
        
        if (!adminExists) {
            await User.create({
                name: 'System Administrator',
                email: 'admin@hotel.com',
                password: 'admin123', // Simple password - NO HASHING
                phone: '09123456789',
                role: 'admin'
            });
            console.log('✅ Admin user created: admin@hotel.com / admin123');
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
}

// Call function on startup
createAdminUser();

// ============ PUBLIC ROUTES ============

// Home route
app.get('/', (req, res) => {
    res.json({ 
        message: '🏨 SAIRA Hotel Booking API',
        status: 'Running',
        database: 'saira_hotel_db',
        admin: 'admin@hotel.com / admin123',
        endpoints: {
            rooms: 'GET /api/rooms',
            book: 'POST /api/bookings',
            admin_login: 'POST /api/auth/admin/login'
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

// Get single room by ID
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

        // Find the room
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        // Calculate total price
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const totalAmount = room.price * nights;

        // Create booking
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

// Admin login (SIMPLE - NO PASSWORD HASHING)
app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with admin role
        const user = await User.findOne({ email, role: 'admin' });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin account not found' 
            });
        }

        // SIMPLE PASSWORD CHECK (NO HASHING)
        if (user.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }

        // Return success
        res.json({
            success: true,
            message: 'Admin login successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// User registration (SIMPLE)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Create user (NO PASSWORD HASHING)
        const user = await User.create({
            name,
            email,
            password, // Store plain password
            phone,
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

// User login (SIMPLE)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // SIMPLE PASSWORD CHECK
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

// ============ ADMIN PROTECTED ROUTES ============

// Middleware to check if user is admin
const checkAdmin = async (req, res, next) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin email required' 
            });
        }

        const user = await User.findOne({ email, role: 'admin' });
        
        if (!user) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        req.admin = user;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Authentication failed' });
    }
};

// Admin dashboard stats
app.get('/api/admin/stats', checkAdmin, async (req, res) => {
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
                totalUsers,
                totalRevenue: 0 // Will calculate later
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all rooms (admin view)
app.get('/api/admin/rooms', checkAdmin, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add new room (IKAW MAG-AADD DITO)
app.post('/api/admin/rooms', checkAdmin, async (req, res) => {
    try {
        const { name, description, type, price, amenities, maxGuests, images } = req.body;

        // Basic validation
        if (!name || !price || !maxGuests) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const room = await Room.create({
            name,
            description: description || 'Comfortable room with amenities',
            type: type || 'standard',
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
app.put('/api/admin/rooms/:id', checkAdmin, async (req, res) => {
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
app.delete('/api/admin/rooms/:id', checkAdmin, async (req, res) => {
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
app.get('/api/admin/bookings', checkAdmin, async (req, res) => {
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
app.put('/api/admin/bookings/:id/status', checkAdmin, async (req, res) => {
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
app.get('/api/admin/users', checkAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`📊 Database: saira_hotel_db`);
    console.log(`🔑 Admin: admin@hotel.com / admin123`);
    console.log(`🎯 Frontend: https://saira-three.vercel.app`);
});