module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false
    },
    
    // Association
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: true // Allow null for simplified hierarchy direct-to-category questions
    },
    
    // NEW: Direct category association for simplified hierarchy
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    // Question content (English - now optional for multilingual support)
    question_text: {
      type: DataTypes.TEXT,
      allowNull: true, // Allow null for Gujarati-only questions
      field: 'question_text' // Explicitly map to database column
    },
    // Options as separate columns (now optional for multilingual support)
    option_a: {
      type: DataTypes.TEXT,
      allowNull: true // Allow null for Gujarati-only questions
    },
    option_b: {
      type: DataTypes.TEXT,
      allowNull: true // Allow null for Gujarati-only questions
    },
    option_c: {
      type: DataTypes.TEXT,
      allowNull: true // Allow null for Gujarati-only questions
    },
    option_d: {
      type: DataTypes.TEXT,
      allowNull: true // Allow null for Gujarati-only questions
    },
    correct_answer: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: false
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Gujarati fields for multilingual support
    question_text_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_a_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_b_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_c_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_d_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    explanation_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Basic fields that exist in database
    marks: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    question_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Order of question from Excel import or manual creation'
    },
    
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  Question.associate = function(models) {
    // Test association
    Question.belongsTo(models.Test, {
      foreignKey: 'test_id',
      as: 'test'
    });

    // NEW: Direct category association for simplified hierarchy
    Question.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // User answers for this question
    Question.hasMany(models.UserAnswer, {
      foreignKey: 'question_id',
      as: 'userAnswers'
    });

    // Question reports for this question
    if (models.QuestionReport) {
      Question.hasMany(models.QuestionReport, {
        foreignKey: 'question_id',
        as: 'reports'
      });
    }
  };

  return Question;
};