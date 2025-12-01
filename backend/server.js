const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// CORS Configuration - ADD YOUR VERCEL URL HERE
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

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://dbUser:Ruzzel123@cluster0.vpmlxq7.mongodb.net/hotel_booking?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// JWT Secret
const JWT_SECRET = 'hotel-booking-secret-key-2024';

// Simple in-memory storage for demo
let users = [];
let rooms = [];
let bookings = [];

// Initialize demo data
function initDemoData() {
    // Demo rooms
    if (rooms.length === 0) {
        rooms = [
            {
                id: '1',
                name: 'Deluxe Room',
                description: 'Spacious room with city view, perfect for couples',
                type: 'double',
                price: 2500,
                amenities: ['Free WiFi', 'Air Conditioning', 'TV', 'Mini Bar', 'Bathroom'],
                maxGuests: 2,
                photos: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600']
            },
            {
                id: '2',
                name: 'Executive Suite',
                description: 'Luxurious suite with living area and premium amenities',
                type: 'suite',
                price: 3500,
                amenities: ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Jacuzzi', 'Living Area'],
                maxGuests: 3,
                photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600']
            },
            {
                id: '3',
                name: 'Standard Room',
                description: 'Comfortable room with all basic amenities',
                type: 'single',
                price: 1800,
                amenities: ['Free WiFi', 'Air Conditioning', 'TV', 'Bathroom'],
                maxGuests: 1,
                photos: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w-600']
            }
        ];
    }

    // Demo admin user
    if (users.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        users.push({
            id: '1',
            name: 'Admin',
            email: 'admin@hotel.com',
            password: hashedPassword,
            phone: '09123456789',
            role: 'admin',
            createdAt: new Date()
        });
    }
}

// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: '🏨 GrandStay Hotel API is LIVE!',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth/*',
            rooms: '/api/rooms',
            bookings: '/api/bookings',
            admin: '/api/admin/*'
        }
    });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // Check if user exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: (users.length + 1).toString(),
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'user',
            createdAt: new Date()
        };
        
        users.push(newUser);
        console.log('👤 New user registered:', newUser.email);
        
        // Create token
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // For demo - allow any login
        if (email.includes('demo') || !users.find(u => u.email === email)) {
            const demoUser = {
                id: '999',
                name: 'Demo User',
                email: email,
                role: 'user'
            };
            
            const token = jwt.sign(
                { userId: demoUser.id, email: demoUser.email, role: demoUser.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.json({
                success: true,
                message: 'Login successful (demo mode)',
                token,
                user: demoUser
            });
        }
        
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: 'Invalid password' });
        }
        
        // Create token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Demo admin credentials
        if (email === 'admin@hotel.com' && password === 'admin123') {
            const adminUser = {
                id: '1',
                name: 'Admin',
                email: email,
                role: 'admin'
            };
            
            const token = jwt.sign(
                { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.json({
                success: true,
                message: 'Admin login successful',
                token,
                user: adminUser
            });
        }
        
        // Check for real admin user
        const user = users.find(u => u.email === email && u.role === 'admin');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Room Routes
app.get('/api/rooms', (req, res) => {
    res.json({
        success: true,
        count: rooms.length,
        rooms: rooms
    });
});

app.get('/api/rooms/:id', (req, res) => {
    const room = rooms.find(r => r.id === req.params.id);
    
    if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    res.json({
        success: true,
        room: room
    });
});

// Booking Routes
app.post('/api/bookings', (req, res) => {
    try {
        const { name, email, phone, checkIn, checkOut, guests, roomId, specialRequests } = req.body;
        
        const bookingId = 'BK-' + Date.now() + Math.floor(Math.random() * 1000);
        
        const newBooking = {
            id: bookingId,
            customer: { name, email, phone },
            roomId,
            checkIn,
            checkOut,
            guests: parseInt(guests) || 1,
            specialRequests,
            status: 'pending',
            createdAt: new Date(),
            totalAmount: 0 // Will calculate based on room price
        };
        
        bookings.push(newBooking);
        console.log('📅 New booking:', bookingId);
        
        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            bookingId: bookingId,
            booking: newBooking
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

app.get('/api/bookings/:id', (req, res) => {
    const booking = bookings.find(b => b.id === req.params.id);
    
    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({
        success: true,
        booking: booking
    });
});

// Admin Routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// Protected admin routes
app.get('/api/admin/dashboard', authenticateToken, authorizeAdmin, (req, res) => {
    const stats = {
        totalRooms: rooms.length,
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        totalUsers: users.filter(u => u.role === 'user').length,
        revenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    };
    
    const recentBookings = bookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    res.json({
        success: true,
        stats: stats,
        recentBookings: recentBookings,
        users: users.filter(u => u.role === 'user').slice(0, 10)
    });
});

app.get('/api/admin/bookings', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({
        success: true,
        bookings: bookings
    });
});

app.put('/api/admin/bookings/:id/status', authenticateToken, authorizeAdmin, (req, res) => {
    const { status } = req.body;
    const booking = bookings.find(b => b.id === req.params.id);
    
    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    booking.status = status;
    booking.updatedAt = new Date();
    
    res.json({
        success: true,
        message: `Booking status updated to ${status}`,
        booking: booking
    });
});

app.post('/api/admin/rooms', authenticateToken, authorizeAdmin, (req, res) => {
    const newRoom = {
        id: (rooms.length + 1).toString(),
        ...req.body,
        createdAt: new Date()
    };
    
    rooms.push(newRoom);
    
    res.status(201).json({
        success: true,
        message: 'Room added successfully',
        room: newRoom
    });
});

app.put('/api/admin/rooms/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const roomIndex = rooms.findIndex(r => r.id === req.params.id);
    
    if (roomIndex === -1) {
        return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    rooms[roomIndex] = {
        ...rooms[roomIndex],
        ...req.body,
        updatedAt: new Date()
    };
    
    res.json({
        success: true,
        message: 'Room updated successfully',
        room: rooms[roomIndex]
    });
});

app.delete('/api/admin/rooms/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const roomIndex = rooms.findIndex(r => r.id === req.params.id);
    
    if (roomIndex === -1) {
        return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    const deletedRoom = rooms.splice(roomIndex, 1)[0];
    
    res.json({
        success: true,
        message: 'Room deleted successfully',
        room: deletedRoom
    });
});

// Initialize demo data
initDemoData();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}`);
    console.log(`🏨 Hotel: GrandStay Hotel Booking System`);
    console.log(`👤 Demo Admin: admin@hotel.com / admin123`);
});