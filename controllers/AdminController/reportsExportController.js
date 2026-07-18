const ErrorHandler = require('../../utils/default/errorHandler');
const { User, Branch, Department } = require('../../models');
const { Op } = require('sequelize');

// Admissions/enrollments CSV export — revenue export already exists at
// SubscriptionController::exportSubscriptions, reused as-is rather than
// duplicated here.
exports.exportEnrollments = async (req, res, next) => {
    try {
        const { status, branch_id, department_id } = req.query;

        const whereClause = {};
        if (status && status !== 'all') whereClause.application_status = status;
        if (branch_id) whereClause.branch_id = branch_id;
        if (department_id) whereClause.department_id = department_id;

        const students = await User.findAll({
            where: whereClause,
            attributes: ['username', 'email', 'phone', 'application_status', 'applied_at', 'created_at'],
            include: [
                { model: Branch, as: 'branch', attributes: ['name'] },
                { model: Department, as: 'department', attributes: ['name'] }
            ],
            order: [['created_at', 'DESC']]
        });

        const escapeCsv = (value) => {
            const str = String(value ?? '');
            return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const csvHeader = 'Username,Email,Phone,Branch,Department,Status,Applied Date,Signed Up\n';
        const csvRows = students.map((s) => [
            s.username,
            s.email,
            s.phone || 'N/A',
            s.branch?.name || 'N/A',
            s.department?.name || 'N/A',
            s.application_status,
            s.applied_at ? new Date(s.applied_at).toISOString().split('T')[0] : 'N/A',
            new Date(s.created_at).toISOString().split('T')[0]
        ].map(escapeCsv).join(',')).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=enrollments_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export enrollments error:', err);
        return next(new ErrorHandler('Failed to export enrollments', 500));
    }
};
