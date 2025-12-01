const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    roomType: {
        type: String,
        enum: ['single', 'double', 'suite'],
        required: true
    },
    pricePerNight: {
        single: Number,
        double: Number
    },
    amenities: [{
        type: String
    }],
    facilities: [{
        type: String
    }],
    services: [{
        type: String
    }],
    photos: [{
        type: String // URLs to images
    }],
    maxGuests: {
        type: Number,
        default: 2
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Room', roomSchema);