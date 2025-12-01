const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = {
    // Verify token for regular users
    user: async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ message: 'No token, authorization denied' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
            req.userRole = decoded.role;
            next();
        } catch (error) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    },

    // Verify token for admin users only
    admin: async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ message: 'No token, authorization denied' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            
            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Admin access required' });
            }

            req.userId = decoded.userId;
            req.userRole = decoded.role;
            next();
        } catch (error) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    }
};

module.exports = authMiddleware;