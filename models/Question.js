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
    
    // Question content (English - primary)
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'question_text' // Explicitly map to database column
    },
    // Options as separate columns (matching database)
    option_a: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_b: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_c: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_d: {
      type: DataTypes.TEXT,
      allowNull: false
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
  };

  return Question;
};