const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssessmentLead = sequelize.define('AssessmentLead', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    first_name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: { msg: 'First name is required' } } },
    last_name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: { msg: 'Last name is required' } } },
    work_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: { msg: 'Please provide a valid work email address' },
        notEmpty: { msg: 'Work email is required' }
      }
    },
    agency_name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: { msg: 'Agency name is required' } } },
    job_title: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: { msg: 'Job title is required' } } },
    employee_count_band: { type: DataTypes.STRING(20), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    agency_type: { type: DataTypes.STRING(50), allowNull: false },
    current_ai_approach: { type: DataTypes.STRING(50), allowNull: false },
    answers: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        // Some MySQL-compatible servers (e.g. MariaDB) store JSON columns as
        // plain text and don't auto-parse them on read the way MySQL 8's
        // native JSON type does - parse defensively so callers always get
        // a real object regardless of the underlying server.
        const raw = this.getDataValue('answers');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    },
    overall_score: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
    maturity_level: {
      type: DataTypes.ENUM('ai_explorer', 'early_adopter', 'developing', 'ai_ready', 'ai_enabled'),
      allowNull: false
    },
    dimension_scores: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const raw = this.getDataValue('dimension_scores');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    },
    top_opportunities: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const raw = this.getDataValue('top_opportunities');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    },
    top_gaps: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const raw = this.getDataValue('top_gaps');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    },
    recommended_priorities: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const raw = this.getDataValue('recommended_priorities');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    },
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'unqualified', 'closed'),
      defaultValue: 'new',
      allowNull: false
    },
    admin_notes: { type: DataTypes.TEXT, allowNull: true },
    contacted_at: { type: DataTypes.DATE, allowNull: true },
    contacted_by: { type: DataTypes.INTEGER, allowNull: true },
    email_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    email_sent_at: { type: DataTypes.DATE, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'assessment_leads',
    timestamps: true,
    underscored: true,
    // underscored:true maps the createdAt/updatedAt *columns* to snake_case,
    // but Sequelize still exposes the *attribute* as createdAt/updatedAt by
    // default - the controller and frontend both expect created_at, so
    // rename the attribute itself to match the physical column.
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['work_email'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['agency_type'] }
    ]
  });

  AssessmentLead.associate = function (models) {
    AssessmentLead.belongsTo(models.Admin, {
      as: 'contactedByAdmin',
      foreignKey: 'contacted_by',
      constraints: false
    });
  };

  return AssessmentLead;
};
