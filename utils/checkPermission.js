const ErrorHandler = require('./default/errorHandler');

// Finer-grained permission gate layered on top of requireRole(). Reads the
// Admin.permissions JSON column (e.g. { manage_revenue: true, edit_branches: true }).
// super_admin always passes, since permissions are meant to scope down
// institution_admin/branch_admin, not restrict the top-level role.
exports.requirePermission = (permissionKey) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(new ErrorHandler('Access denied. Authentication required.', 401));
        }

        if (req.admin.role === 'super_admin') {
            return next();
        }

        const permissions = req.admin.permissions || {};
        if (!permissions[permissionKey]) {
            return next(new ErrorHandler('Access denied. Insufficient permissions.', 403));
        }

        next();
    };
};
