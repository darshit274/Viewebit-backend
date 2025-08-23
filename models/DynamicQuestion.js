module.exports = (sequelize, DataTypes) => {
  const DynamicQuestion = sequelize.define('DynamicQuestion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    question_text_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_a: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_a_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_b: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_b_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_c: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_c_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    option_d: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    option_d_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    correct_answer: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: false
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    explanation_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    marks: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    difficulty_level: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      defaultValue: 'medium',
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'dynamic_questions',
    underscored: true,
    timestamps: true,
    hooks: {
      // After create, update category's question count and node type
      afterCreate: async (question, options) => {
        const DynamicCategory = sequelize.models.DynamicCategory;
        
        await DynamicCategory.increment(
          { questions_count: 1 },
          { where: { id: question.category_id } }
        );

        const category = await DynamicCategory.findByPk(question.category_id);
        if (category) {
          // Update category to be a question holder if it was unset
          if (category.node_type === 'unset') {
            await category.update({ 
              node_type: 'question_holder',
              has_questions: true 
            });
          } else {
            await category.update({ has_questions: true });
          }

          // Calculate and update total marks for the category
          await DynamicQuestion.updateCategoryTotalMarks(question.category_id);
          
          // Update total questions count up the hierarchy
          await DynamicCategory.updateTotalQuestionsCount(question.category_id);
        }
      },

      // After update, recalculate total marks if marks changed
      afterUpdate: async (question, options) => {
        if (question.changed('marks')) {
          await DynamicQuestion.updateCategoryTotalMarks(question.category_id);
        }
      },

      // After destroy, update category's counts
      afterDestroy: async (question, options) => {
        const DynamicCategory = sequelize.models.DynamicCategory;
        
        await DynamicCategory.decrement(
          'questions_count',
          { where: { id: question.category_id } }
        );

        // Check if category still has questions
        const category = await DynamicCategory.findByPk(question.category_id);
        if (category && category.questions_count <= 0) {
          await category.update({ 
            has_questions: false,
            node_type: category.has_subcategories ? 'container' : 'unset'
          });
        }

        // Update total marks and questions count
        await DynamicQuestion.updateCategoryTotalMarks(question.category_id);
        await DynamicCategory.updateTotalQuestionsCount(question.category_id);
      }
    }
  });

  DynamicQuestion.associate = function(models) {
    DynamicQuestion.belongsTo(models.DynamicCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // For test sessions and user answers (if needed)
    DynamicQuestion.hasMany(models.UserAnswer, {
      foreignKey: 'question_id',
      as: 'userAnswers'
    });
  };

  // Static method to update category's total marks
  DynamicQuestion.updateCategoryTotalMarks = async function(categoryId) {
    const totalMarks = await this.sum('marks', {
      where: { 
        category_id: categoryId,
        is_active: true 
      }
    });

    const DynamicCategory = sequelize.models.DynamicCategory;
    await DynamicCategory.update(
      { total_marks: totalMarks || 0 },
      { where: { id: categoryId } }
    );
  };

  // Validate before adding question to category
  DynamicQuestion.validateCanAddToCategory = async function(categoryId) {
    const DynamicCategory = sequelize.models.DynamicCategory;
    
    try {
      await DynamicCategory.validateHierarchyRule(categoryId, 'add_questions');
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Get questions with formatting for frontend
  DynamicQuestion.getFormattedQuestions = async function(categoryId, language = 'english') {
    const questions = await this.findAll({
      where: { 
        category_id: categoryId,
        is_active: true 
      },
      order: [['display_order', 'ASC'], ['created_at', 'ASC']]
    });

    return questions.map(question => {
      const isGujarati = language.toLowerCase() === 'gujarati';
      
      return {
        id: question.id,
        uuid: question.uuid,
        question_text: isGujarati && question.question_text_gujarati 
          ? question.question_text_gujarati 
          : question.question_text,
        options: {
          A: isGujarati && question.option_a_gujarati 
            ? question.option_a_gujarati 
            : question.option_a,
          B: isGujarati && question.option_b_gujarati 
            ? question.option_b_gujarati 
            : question.option_b,
          C: isGujarati && question.option_c_gujarati 
            ? question.option_c_gujarati 
            : question.option_c,
          D: isGujarati && question.option_d_gujarati 
            ? question.option_d_gujarati 
            : question.option_d,
        },
        correct_answer: question.correct_answer,
        explanation: isGujarati && question.explanation_gujarati 
          ? question.explanation_gujarati 
          : question.explanation,
        marks: question.marks,
        difficulty_level: question.difficulty_level,
        subject: question.subject,
        topic: question.topic
      };
    });
  };

  return DynamicQuestion;
};