'use strict';

module.exports = (sequelize, DataTypes) => {
  const QuestionReport = sequelize.define('QuestionReport', {
    // Primary Key
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false
    },

    // Foreign Keys
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'References questions.id'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User who submitted the report'
    },

    // Report Data
    report_type: {
      type: DataTypes.ENUM('wrong_question', 'wrong_solution', 'other'),
      allowNull: false,
      comment: 'Type of issue reported'
    },
    report_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User description for "other" type or additional details'
    },
    user_selected_answer: {
      type: DataTypes.STRING(1),
      allowNull: true,
      comment: 'A, B, C, or D - what user answered'
    },

    // Status Management
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Current status of the report'
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes visible only to admins'
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Admin user ID who reviewed this report'
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the report was reviewed'
    },

    // Audit Trail
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When report was submitted'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last update timestamp'
    }
  }, {
    tableName: 'question_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Stores user-submitted reports for question issues'
  });

  // Define associations
  QuestionReport.associate = function(models) {
    // Question association
    QuestionReport.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // User who submitted the report
    // Note: user_id is INTEGER but User's primary key is uuid
    // So we need to join on User.id (the integer id field)
    QuestionReport.belongsTo(models.User, {
      foreignKey: 'user_id',
      targetKey: 'id', // Join on User.id instead of primary key (uuid)
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Admin who reviewed the report
    QuestionReport.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      targetKey: 'id', // Join on User.id instead of primary key (uuid)
      as: 'reviewer',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  return QuestionReport;
};
