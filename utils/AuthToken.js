const jwt = require('jsonwebtoken');

// Authentication middleware to verify JWT tokens
exports.authToken = async (req, res, next) => {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authorization header found. Please provide a token.' 
      });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token not found in authorization header.' 
      });
    }

    // Verify token using the same secret as auth controller
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get the user from database to ensure complete user data
    const { User } = require('../models');
    
    // Look up user by UUID
    const user = await User.findOne({ where: { uuid: decoded.uuid } });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found. Please login again.' 
      });
    }

    // Add complete user info to request object
    req.user = {
      uuid: user.uuid,     // User UUID (primary key)
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified
    };
    
    next();

  } catch (error) {
    // Handle different JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Please login again.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
    }

    // Handle other errors
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication.' 
    });
  }
};

// Optional middleware for routes that can work with or without authentication
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { User } = require('../models');
        const user = await User.findOne({ where: { uuid: decoded.id } });
        
        if (user) {
          req.user = {
            id: user.id,         // Database primary key
            uuid: user.uuid,     // User UUID for foreign key relations
            email: user.email,
            username: user.username,
            isEmailVerified: user.isEmailVerified
          };
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

// Helper method to verify token without middleware wrapper
exports.verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Admin authorization middleware
exports.isAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user && !req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has admin privileges
    if (req.admin) {
      // Already verified as admin
      return next();
    }

    // For regular users, check if they have admin role
    const { Admin } = require('../models');
    const admin = await Admin.findOne({ 
      where: { email: req.user.email, is_active: true } 
    });

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};