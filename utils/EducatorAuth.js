const jwt = require('jsonwebtoken');
const { Educator } = require('../models');
const ErrorHandler = require('./default/errorHandler');

exports.educatorAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new ErrorHandler('Access denied. No token provided.', 401));
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return next(new ErrorHandler('Access denied. No token provided.', 401));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find educator (fetch current_session_id for single-device enforcement)
        const educator = await Educator.findByPk(decoded.id, {
            attributes: ['id', 'name', 'email', 'institution_id', 'branch_id', 'department_id', 'isActive', 'current_session_id']
        });

        if (!educator) {
            return next(new ErrorHandler('Invalid token. Educator not found.', 401));
        }

        if (!educator.isActive) {
            return next(new ErrorHandler('Account is deactivated.', 403));
        }

        // Single-device enforcement: check if this token's session matches the active session in DB
        if (!decoded.sessionId || educator.current_session_id !== decoded.sessionId) {
            return next(new ErrorHandler('Your session was ended because you logged in from another device. Please login again.', 401));
        }

        // Add educator to request object
        req.educator = educator;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new ErrorHandler('Invalid token.', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new ErrorHandler('Token expired.', 401));
        }
        return next(new ErrorHandler('Token verification failed.', 401));
    }
};
