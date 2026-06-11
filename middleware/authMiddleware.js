// Re-export the auth middleware from utils with the expected function name
const { authToken, optionalAuth, isAdmin } = require('../utils/AuthToken');

// Export as verifyToken to match the import in routes
module.exports = authToken;

// Also export other auth functions if needed
module.exports.verifyToken = authToken;
module.exports.optionalAuth = optionalAuth;
module.exports.isAdmin = isAdmin;