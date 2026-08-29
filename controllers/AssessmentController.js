const ErrorHandler = require('../utils/default/errorHandler');
const { AssessmentLead, Admin } = require('../models');
const { Op } = require('sequelize');
const { SECTIONS, LEAD_FIELDS, toPublicSchema } = require('../data/assessmentQuestions');
const { computeAssessmentResult, MATURITY_LEVELS } = require('../services/assessmentScoringEngine');
const { sendAssessmentResultEmail } = require('../utils/assessmentMailer');
const { buildAssessmentResultEmail } = require('../utils/emailTemplates/assessmentResultEmail');
const { verifyTurnstileToken } = require('../utils/verifyTurnstile');
const { mapLeadToWebhookPayload, sendLeadToWebhook } = require('../utils/leadsWebhook');

const REQUIRED_LEAD_FIELDS = LEAD_FIELDS.filter((f) => f.required).map((f) => f.id);

function collectAllQuestionIds() {
  const ids = [];
  SECTIONS.forEach((section) => {
    if (section.matrix) {
      section.rows.forEach((row) => ids.push(row.id));
    } else {
      section.questions.forEach((q) => ids.push(q.id));
    }
  });
  return ids;
}
const ALL_QUESTION_IDS = collectAllQuestionIds();

// GET /api/assessment/questions (public)
exports.getQuestions = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: toPublicSchema() });
  } catch (err) {
    console.error('Get assessment questions error:', err);
    return next(new ErrorHandler('Failed to load assessment questions', 500));
  }
};

// POST /api/assessment/submit (public)
exports.submitAssessment = async (req, res, next) => {
  try {
    const { leadInfo = {}, answers = {}, turnstileToken } = req.body;

    if (req.body.website) {
      return res.status(400).json({ success: false, message: 'Invalid submission' });
    }

    const turnstileResult = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!turnstileResult.success) {
      console.warn('Turnstile verification failed:', turnstileResult.errorCodes);
      return res.status(400).json({
        success: false,
        message: 'Verification failed. Please refresh the page and try again.'
      });
    }

    const missingLeadFields = REQUIRED_LEAD_FIELDS.filter((field) => !leadInfo[field]);
    if (missingLeadFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: missingLeadFields.map((field) => ({ field, message: `${field} is required` }))
      });
    }

    const missingAnswers = ALL_QUESTION_IDS.filter(
      (id) => answers[id] === undefined || answers[id] === null || answers[id] === ''
    );
    if (missingAnswers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please answer every question before submitting.',
        errors: missingAnswers.map((id) => ({ field: id, message: 'This question is required' }))
      });
    }

    const result = computeAssessmentResult(answers);

    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    const lead = await AssessmentLead.create({
      first_name: leadInfo.first_name,
      last_name: leadInfo.last_name,
      work_email: leadInfo.work_email,
      agency_name: leadInfo.agency_name,
      job_title: leadInfo.job_title,
      employee_count_band: leadInfo.employee_count_band,
      phone: leadInfo.phone || null,
      agency_type: answers.agency_type,
      current_ai_approach: answers.ai_approach,
      answers,
      overall_score: result.overallScore,
      maturity_level: result.maturityLevel,
      dimension_scores: result.dimensionScores,
      top_opportunities: result.topOpportunities,
      top_gaps: result.topGaps,
      recommended_priorities: result.recommendedPriorities,
      ip_address,
      user_agent,
      completed_at: new Date()
    });

    try {
      const { subject, htmlContent } = buildAssessmentResultEmail({ firstName: leadInfo.first_name, result });
      await sendAssessmentResultEmail({ receiver: leadInfo.work_email, subject, htmlContent });
      await lead.update({ email_sent: true, email_sent_at: new Date() });
    } catch (emailErr) {
      console.error('Assessment result email failed to send:', emailErr);
    }

    try {
      await sendLeadToWebhook(lead);
      await lead.update({ crm_synced: true, crm_synced_at: new Date() });
    } catch (webhookErr) {
      console.error('CRM webhook failed to send:', webhookErr);
    }

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      data: {
        id: lead.id,
        overallScore: result.overallScore,
        maturityLevel: result.maturityLevel,
        maturityLabel: MATURITY_LEVELS[result.maturityLevel].label,
        maturityDescription: MATURITY_LEVELS[result.maturityLevel].description,
        dimensionScores: result.dimensionScores,
        topOpportunities: result.topOpportunities,
        topGaps: result.topGaps,
        recommendedPriorities: result.recommendedPriorities
      }
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    return next(new ErrorHandler('Failed to submit assessment. Please try again.', 500));
  }
};

// GET /api/assessment/admin/leads (admin)
exports.getAllLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const whereClause = {};
    if (status && status !== 'all') whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { work_email: { [Op.like]: `%${search}%` } },
        { agency_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: leads } = await AssessmentLead.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [{ model: Admin, as: 'contactedByAdmin', attributes: ['id', 'name', 'email'] }]
    });

    const stats = {
      total: await AssessmentLead.count(),
      new: await AssessmentLead.count({ where: { status: 'new' } }),
      contacted: await AssessmentLead.count({ where: { status: 'contacted' } }),
      qualified: await AssessmentLead.count({ where: { status: 'qualified' } })
    };

    const totalPages = Math.ceil(count / parseInt(limit));
    const currentPage = parseInt(page);

    res.set('Cache-Control', 'no-store');
    res.status(200).json({
      success: true,
      data: {
        leads,
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
    console.error('Get all assessment leads error:', err);
    return next(new ErrorHandler('Failed to fetch assessment leads', 500));
  }
};

// GET /api/assessment/admin/leads/:id (admin)
exports.getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await AssessmentLead.findByPk(id, {
      include: [{ model: Admin, as: 'contactedByAdmin', attributes: ['id', 'name', 'email'] }]
    });
    if (!lead) return next(new ErrorHandler('Assessment lead not found', 404));
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    console.error('Get assessment lead by ID error:', err);
    return next(new ErrorHandler('Failed to fetch assessment lead', 500));
  }
};

// PATCH /api/assessment/admin/leads/:id/status (admin)
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.admin.id;

    const validStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return next(new ErrorHandler(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const lead = await AssessmentLead.findByPk(id);
    if (!lead) return next(new ErrorHandler('Assessment lead not found', 404));

    const updateData = { status };
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (status === 'contacted' && !lead.contacted_at) {
      updateData.contacted_at = new Date();
      updateData.contacted_by = adminId;
    }

    await lead.update(updateData);

    const updatedLead = await AssessmentLead.findByPk(id, {
      include: [{ model: Admin, as: 'contactedByAdmin', attributes: ['id', 'name', 'email'] }]
    });

    res.status(200).json({ success: true, message: 'Assessment lead updated successfully', data: updatedLead });
  } catch (err) {
    console.error('Update assessment lead status error:', err);
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    return next(new ErrorHandler('Failed to update assessment lead', 500));
  }
};

// DELETE /api/assessment/admin/leads/:id (admin)
// GDPR erasure: permanently removes a respondent's submitted assessment data.
exports.deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await AssessmentLead.findByPk(id);
    if (!lead) return next(new ErrorHandler('Assessment lead not found', 404));

    await lead.destroy();

    res.status(200).json({ success: true, message: 'Assessment lead deleted successfully' });
  } catch (err) {
    console.error('Delete assessment lead error:', err);
    return next(new ErrorHandler('Failed to delete assessment lead', 500));
  }
};

// GET /api/assessment/leads/export (CRM backfill puller - X-API-Key auth, not adminAuth)
// Not actively polled yet per the CRM's initial webhook-only rollout - exists so a
// manual script can backfill anything the webhook ever misses, without another
// round of setup. Returns the same payload shape as the webhook so the CRM can
// reuse its webhook-ingestion logic for pulled records too.
exports.exportLeads = async (req, res, next) => {
  try {
    const { since, page = 1, limit = 100 } = req.query;

    const whereClause = {};
    if (since) {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return next(new ErrorHandler('Invalid "since" date', 400));
      }
      whereClause.completed_at = { [Op.gte]: sinceDate };
    }

    const cappedLimit = Math.min(parseInt(limit) || 100, 500);
    const offset = (parseInt(page) - 1) * cappedLimit;

    const { count, rows: leads } = await AssessmentLead.findAndCountAll({
      where: whereClause,
      order: [['completed_at', 'ASC']],
      limit: cappedLimit,
      offset
    });

    res.status(200).json({
      success: true,
      data: {
        leads: leads.map(mapLeadToWebhookPayload),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / cappedLimit),
          totalItems: count,
          itemsPerPage: cappedLimit
        }
      }
    });
  } catch (err) {
    console.error('Export assessment leads error:', err);
    return next(new ErrorHandler('Failed to export assessment leads', 500));
  }
};

// GET /api/assessment/admin/leads/stats (admin)
exports.getStats = async (req, res, next) => {
  try {
    const total = await AssessmentLead.count();
    const byStatus = {};
    for (const s of ['new', 'contacted', 'qualified', 'unqualified', 'closed']) {
      byStatus[s] = await AssessmentLead.count({ where: { status: s } });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await AssessmentLead.count({ where: { created_at: { [Op.gte]: today } } });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = await AssessmentLead.count({ where: { created_at: { [Op.gte]: weekAgo } } });

    const recentLeads = await AssessmentLead.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'first_name', 'last_name', 'agency_name', 'overall_score', 'maturity_level', 'status', 'created_at']
    });

    res.status(200).json({ success: true, data: { total, ...byStatus, todayCount, weekCount, recentLeads } });
  } catch (err) {
    console.error('Get assessment stats error:', err);
    return next(new ErrorHandler('Failed to fetch assessment statistics', 500));
  }
};
