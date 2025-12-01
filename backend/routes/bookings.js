const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { body, validationResult } = require('express-validator');

// Create booking
router.post('/create', [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('contactNumber').notEmpty(),
    body('checkInDate').notEmpty(),
    body('checkOutDate').notEmpty(),
    body('roomId').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name,
            email,
            contactNumber,
            roomId,
            roomType,
            checkInDate,
            checkOutDate,
            numberOfGuests,
            paymentMethod,
            specialRequests
        } = req.body;

        // Get room details
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Calculate total price
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        let pricePerNight = 0;
        if (roomType === 'single' && room.pricePerNight.single) {
            pricePerNight = room.pricePerNight.single;
        } else if (roomType === 'double' && room.pricePerNight.double) {
            pricePerNight = room.pricePerNight.double;
        } else {
            pricePerNight = room.pricePerNight || 0;
        }

        const totalPrice = pricePerNight * nights;

        // Create booking (in real app, check if user exists)
        const booking = new Booking({
            name,
            email,
            contactNumber,
            room: roomId,
            roomType,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfGuests: numberOfGuests || 1,
            totalPrice,
            paymentMethod,
            specialRequests,
            status: 'pending'
        });

        await booking.save();

        res.status(201).json({
            message: 'Booking created successfully',
            booking,
            bookingId: booking._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('room', 'name description photos');
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;