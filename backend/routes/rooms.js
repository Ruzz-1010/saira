const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.find({ isAvailable: true });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single room
router.get('/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Search rooms by dates
router.post('/search', async (req, res) => {
    try {
        const { checkIn, checkOut, guests } = req.body;
        
        // Get all available rooms that can accommodate guests
        const rooms = await Room.find({
            isAvailable: true,
            maxGuests: { $gte: guests || 1 }
        });

        // In a real app, you would check booking dates here
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;