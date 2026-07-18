const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const ErrorHandler = require('./default/errorHandler');

exports.adminAuth = async (req, res, next) => {
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
        
        // Find admin (fetch current_session_id for single-device enforcement)
        const admin = await Admin.findByPk(decoded.id, {
            attributes: ['id', 'name', 'email', 'role', 'isActive', 'current_session_id', 'permissions', 'institution_id', 'branch_id', 'department_id']
        });

        if (!admin) {
            return next(new ErrorHandler('Invalid token. Admin not found.', 401));
        }

        if (!admin.isActive) {
            return next(new ErrorHandler('Account is deactivated.', 403));
        }

        // Single-device enforcement: check if this token's session matches the active session in DB
        if (!decoded.sessionId || admin.current_session_id !== decoded.sessionId) {
            return next(new ErrorHandler('Your session was ended because you logged in from another device. Please login again.', 401));
        }

        // Add admin to request object
        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new ErrorHandler('Invalid token.', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new ErrorHandler('Token expired.', 401));
        }
        // console.log(error,"fffffffffffff");
        
        return next(new ErrorHandler('Token verification failed.', 401));
    }
};

// Role-based middleware
exports.requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(new ErrorHandler('Access denied. Authentication required.', 401));
        }

        if (!roles.includes(req.admin.role)) {
            return next(new ErrorHandler('Access denied. Insufficient permissions.', 403));
        }

        next();
    };
};