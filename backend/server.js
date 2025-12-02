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
// DATABASE CONNECTION
// =============================================
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/grandstay_hotels?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB: grandstay_hotels'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// =============================================
// SCHEMAS
// =============================================
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    bookingsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    type: { type: String, default: 'standard' },
    price: { type: Number, required: true },
    amenities: [String],
    maxGuests: { type: Number, default: 2 },
    images: [String],
    roomNumber: String,
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    roomId: { type: String, required: true },
    roomName: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true, default: 1 },
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled', 'checked-in', 'checked-out'] },
    specialRequests: String,
    paymentMethod: { type: String, default: 'cash' },
    createdAt: { type: Date, default: Date.now }
});

// =============================================
// MODELS
// =============================================
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// =============================================
// CREATE ADMIN ACCOUNT ONLY
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
// MIDDLEWARE
// =============================================
const verifyAdmin = async (req, res, next) => {
    try {
        // For now, simple admin check - in production use JWT
        const admin = await User.findOne({ email: 'admin@hotel.com', role: 'admin' });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Admin not found' });
        }
        req.admin = admin;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Authentication error' });
    }
};

// =============================================
// PUBLIC ROUTES
// =============================================
app.get('/', (req, res) => {
    res.json({ 
        message: '🏨 GrandStay Hotels API',
        status: 'OK',
        database: 'grandstay_hotels',
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
        
        // Validate required fields
        if (!customerName || !customerEmail || !customerPhone || !checkIn || !checkOut || !guests || !roomId) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be filled' 
            });
        }
        
        // Find room
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ 
                success: false, 
                message: 'Room not found' 
            });
        }
        
        // Check if room is available
        if (!room.isAvailable) {
            return res.status(400).json({ 
                success: false, 
                message: 'Room is not available' 
            });
        }
        
        // Calculate total
        const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid date range' 
            });
        }
        
        const totalAmount = room.price * nights;
        
        // Create booking
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
            specialRequests: specialRequests || '',
            status: 'pending'
        });
        
        // Update user's booking count if user exists
        await User.findOneAndUpdate(
            { email: customerEmail },
            { $inc: { bookingsCount: 1 } },
            { upsert: true, new: true }
        );
        
        res.json({
            success: true,
            message: 'Booking successful!',
            booking,
            bookingId: booking._id
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Booking failed', 
            error: error.message 
        });
    }
});

// =============================================
// AUTHENTICATION ROUTES
// =============================================

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email and password are required' 
            });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }
        
        const user = await User.create({ 
            name, 
            email, 
            password, 
            phone,
            role: 'user'
        });
        
        res.json({
            success: true,
            message: 'Registration successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed',
            error: error.message
        });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        // Simple password check (in production, use bcrypt)
        if (user.password !== password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Login failed',
            error: error.message
        });
    }
});

// Admin login
app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        const admin = await User.findOne({ 
            email, 
            role: 'admin' 
        });
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }
        
        if (admin.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
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
        res.status(500).json({ 
            success: false, 
            message: 'Login failed',
            error: error.message
        });
    }
});

// =============================================
// ADMIN ROUTES (ALL REQUIRE ADMIN AUTH)
// =============================================

// Admin: Get all rooms
app.get('/api/admin/rooms', verifyAdmin, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message
        });
    }
});

// Admin: Add room
app.post('/api/admin/rooms', verifyAdmin, async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.json({ 
            success: true, 
            message: 'Room added successfully', 
            room 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add room',
            error: error.message
        });
    }
});

// Admin: Update room
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
            message: 'Room updated', 
            room 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update room',
            error: error.message
        });
    }
});

// Admin: Delete room
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete room',
            error: error.message
        });
    }
});

// Admin: Get all bookings
app.get('/api/admin/bookings', verifyAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message
        });
    }
});

// Admin: Update booking status
app.put('/api/admin/bookings/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status is required' 
            });
        }
        
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );
        
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update booking',
            error: error.message
        });
    }
});

// Admin: Get all users
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 });
            
        // Add bookings count for each user
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const bookingsCount = await Booking.countDocuments({ 
                    customerEmail: user.email 
                });
                return {
                    ...user.toObject(),
                    bookingsCount
                };
            })
        );
        
        res.json({ success: true, users: usersWithStats });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message
        });
    }
});

// Admin: Delete user (THE MISSING ENDPOINT)
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Check if user is admin
        if (user.role === 'admin') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete admin user' 
            });
        }
        
        // Delete user's bookings first
        await Booking.deleteMany({ customerEmail: user.email });
        
        // Delete the user
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

// Admin: Get dashboard statistics
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
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
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message
        });
    }
});

// =============================================
// CREATE ADMIN
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
    console.log(`🔑 Admin: admin@hotel.com / admin123`);
    console.log(`\n📊 Available Endpoints:`);
    console.log(`├── /api/rooms (GET) - Get available rooms`);
    console.log(`├── /api/bookings (POST) - Create booking`);
    console.log(`├── /api/auth/register (POST) - User registration`);
    console.log(`├── /api/auth/login (POST) - User login`);
    console.log(`├── /api/auth/admin/login (POST) - Admin login`);
    console.log(`├── /api/admin/rooms (GET, POST, PUT, DELETE) - Manage rooms`);
    console.log(`├── /api/admin/bookings (GET, PUT) - Manage bookings`);
    console.log(`├── /api/admin/users (GET, DELETE) - Manage users`);
    console.log(`└── /api/admin/stats (GET) - Dashboard statistics`);
});