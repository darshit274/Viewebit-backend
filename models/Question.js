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
      allowNull: false
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
    
    // Gujarati fields removed - not in database
    
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

    // Removed Admin association - created_by field doesn't exist

    // User answers for this question
    Question.hasMany(models.UserAnswer, {
      foreignKey: 'question_id',
      as: 'userAnswers'
    });
  };

  return Question;
};