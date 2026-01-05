const ErrorHandler = require('../utils/default/errorHandler');
const { ContactQuery, Admin } = require('../models');
const { Op } = require('sequelize');

// Submit contact query (Public endpoint - no auth required)
exports.submitQuery = async (req, res, next) => {
  try {
    const { full_name, email, mobile_number, query_message } = req.body;

    // Get IP address and user agent for spam prevention
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    // Check for honeypot field (spam prevention)
    if (req.body.website) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission'
      });
    }

    // Clean mobile number - keep only digits and + sign
    const cleaned_mobile = mobile_number.replace(/[^0-9+]/g, '');

    // Create query
    const query = await ContactQuery.create({
      full_name,
      email,
      mobile_number: cleaned_mobile,
      query_message,
      ip_address,
      user_agent,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Your query has been submitted successfully. We will get back to you soon.',
      data: {
        id: query.id,
        full_name: query.full_name,
        email: query.email,
        status: query.status,
        created_at: query.created_at
      }
    });
  } catch (err) {
    console.error('Submit query error:', err);

    // Handle validation errors
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map(e => ({
        field: e.path,
        message: e.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    return next(new ErrorHandler('Failed to submit query. Please try again.', 500));
  }
};

// Get all queries with pagination and filters (Admin only)
exports.getAllQueries = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    const whereClause = {};

    // Status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Search filter (name, email, or mobile)
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile_number: { [Op.like]: `%${search}%` } }
      ];
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get queries with pagination
    const { count, rows: queries } = await ContactQuery.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: Admin,
          as: 'viewedByAdmin',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Admin,
          as: 'solvedByAdmin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Get stats
    const stats = {
      total: await ContactQuery.count(),
      pending: await ContactQuery.count({ where: { status: 'pending' } }),
      viewed: await ContactQuery.count({ where: { status: 'viewed' } }),
      solved: await ContactQuery.count({ where: { status: 'solved' } })
    };

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));
    const currentPage = parseInt(page);

    res.status(200).json({
      success: true,
      data: {
        queries,
        pagination: {
          currentPage,
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1
        },
        stats
      }
    });
  } catch (err) {
    console.error('Get all queries error:', err);
    return next(new ErrorHandler('Failed to fetch queries', 500));
  }
};

// Get single query by ID (Admin only)
exports.getQueryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = await ContactQuery.findByPk(id, {
      include: [
        {
          model: Admin,
          as: 'viewedByAdmin',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Admin,
          as: 'solvedByAdmin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!query) {
      return next(new ErrorHandler('Query not found', 404));
    }

    res.status(200).json({
      success: true,
      data: query
    });
  } catch (err) {
    console.error('Get query by ID error:', err);
    return next(new ErrorHandler('Failed to fetch query', 500));
  }
};

// Update query status (Admin only)
exports.updateQueryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.admin.id;

    // Validate status
    if (!status || !['viewed', 'solved'].includes(status)) {
      return next(new ErrorHandler('Invalid status. Must be "viewed" or "solved"', 400));
    }

    // Find query
    const query = await ContactQuery.findByPk(id);

    if (!query) {
      return next(new ErrorHandler('Query not found', 404));
    }

    // Update query based on status
    const updateData = { status };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    if (status === 'viewed' && query.status === 'pending') {
      updateData.viewed_at = new Date();
      updateData.viewed_by = adminId;
    }

    if (status === 'solved') {
      updateData.solved_at = new Date();
      updateData.solved_by = adminId;

      // If not yet marked as viewed, mark it as viewed too
      if (!query.viewed_at) {
        updateData.viewed_at = new Date();
        updateData.viewed_by = adminId;
      }
    }

    await query.update(updateData);

    // Fetch updated query with associations
    const updatedQuery = await ContactQuery.findByPk(id, {
      include: [
        {
          model: Admin,
          as: 'viewedByAdmin',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Admin,
          as: 'solvedByAdmin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Query status updated successfully',
      data: updatedQuery
    });
  } catch (err) {
    console.error('Update query status error:', err);

    // Handle validation errors
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map(e => ({
        field: e.path,
        message: e.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    return next(new ErrorHandler('Failed to update query status', 500));
  }
};

// Delete query (Admin only)
exports.deleteQuery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = await ContactQuery.findByPk(id);

    if (!query) {
      return next(new ErrorHandler('Query not found', 404));
    }

    await query.destroy();

    res.status(200).json({
      success: true,
      message: 'Query deleted successfully'
    });
  } catch (err) {
    console.error('Delete query error:', err);
    return next(new ErrorHandler('Failed to delete query', 500));
  }
};

// Get query statistics (Admin only)
exports.getStats = async (req, res, next) => {
  try {
    // Get total counts by status
    const total = await ContactQuery.count();
    const pending = await ContactQuery.count({ where: { status: 'pending' } });
    const viewed = await ContactQuery.count({ where: { status: 'viewed' } });
    const solved = await ContactQuery.count({ where: { status: 'solved' } });

    // Get today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await ContactQuery.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    });

    // Get this week's count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = await ContactQuery.count({
      where: {
        created_at: {
          [Op.gte]: weekAgo
        }
      }
    });

    // Get this month's count
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthCount = await ContactQuery.count({
      where: {
        created_at: {
          [Op.gte]: monthAgo
        }
      }
    });

    // Get recent queries (last 5)
    const recentQueries = await ContactQuery.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'full_name', 'status', 'created_at']
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        viewed,
        solved,
        todayCount,
        weekCount,
        monthCount,
        recentQueries
      }
    });
  } catch (err) {
    console.error('Get stats error:', err);
    return next(new ErrorHandler('Failed to fetch statistics', 500));
  }
};
