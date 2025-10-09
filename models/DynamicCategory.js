module.exports = (sequelize, DataTypes) => {
  const DynamicCategory = sequelize.define('DynamicCategory', {
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
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    parent_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Self-referencing for hierarchy - null for root categories'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name_gujarati: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    node_type: {
      type: DataTypes.ENUM('container', 'question_holder', 'unset'),
      defaultValue: 'unset',
      allowNull: false
    },
    has_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    has_subcategories: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    questions_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    subcategories_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    total_questions_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
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
    },
    // Test configuration
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    total_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    difficulty_level: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      defaultValue: 'medium',
      allowNull: false
    },
    negative_marking_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    negative_marks_per_wrong: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.25,
      allowNull: false
    },
    is_free_in_paid_series: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'If true, this category quiz is free even if the parent test series is paid'
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'dynamic_categories',
    underscored: true,
    timestamps: true,
    hooks: {
      // Before create, set hierarchy level based on parent
      beforeCreate: async (category, options) => {
        if (category.parent_category_id) {
          const parent = await DynamicCategory.findByPk(category.parent_category_id);
          if (parent) {
            category.hierarchy_level = parent.hierarchy_level + 1;
          }
        } else {
          category.hierarchy_level = 0; // Root level
        }
      },

      // After create, update parent's subcategories count
      afterCreate: async (category, options) => {
        if (category.parent_category_id) {
          await DynamicCategory.increment(
            { subcategories_count: 1, has_subcategories: true },
            { where: { id: category.parent_category_id } }
          );
          
          // Update parent node type to container if it was unset
          const parent = await DynamicCategory.findByPk(category.parent_category_id);
          if (parent && parent.node_type === 'unset') {
            await parent.update({ 
              node_type: 'container',
              has_subcategories: true 
            });
          }

          // Update total questions count up the hierarchy
          await DynamicCategory.updateTotalQuestionsCount(category.parent_category_id);
        }
      },

      // After destroy, update parent's counts
      afterDestroy: async (category, options) => {
        if (category.parent_category_id) {
          await DynamicCategory.decrement(
            'subcategories_count',
            { where: { id: category.parent_category_id } }
          );
          
          // Check if parent still has subcategories
          const parent = await DynamicCategory.findByPk(category.parent_category_id);
          if (parent && parent.subcategories_count <= 0) {
            await parent.update({ 
              has_subcategories: false,
              node_type: parent.has_questions ? 'question_holder' : 'unset'
            });
          }

          // Update total questions count up the hierarchy
          await DynamicCategory.updateTotalQuestionsCount(category.parent_category_id);
        }
      }
    }
  });

  DynamicCategory.associate = function(models) {
    // Self-referencing relationship
    DynamicCategory.belongsTo(models.DynamicCategory, {
      foreignKey: 'parent_category_id',
      as: 'parentCategory'
    });

    DynamicCategory.hasMany(models.DynamicCategory, {
      foreignKey: 'parent_category_id',
      as: 'subcategories'
    });

    // Belongs to test series
    DynamicCategory.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });

    // Has many questions (only if it's a question holder)
    DynamicCategory.hasMany(models.DynamicQuestion, {
      foreignKey: 'category_id',
      as: 'questions'
    });
  };

  // Static methods for business logic
  DynamicCategory.validateHierarchyRule = async function(categoryId, action) {
    const category = await this.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    if (action === 'add_questions') {
      if (category.has_subcategories) {
        throw new Error('Cannot add questions to a category that has subcategories');
      }
    } else if (action === 'add_subcategory') {
      if (category.has_questions) {
        throw new Error('Cannot add subcategories to a category that has questions');
      }
    }

    return true;
  };

  DynamicCategory.updateTotalQuestionsCount = async function(categoryId) {
    if (!categoryId) return;

    // Get all descendant questions count recursively
    const category = await this.findByPk(categoryId, {
      include: [{
        model: this,
        as: 'subcategories',
        include: ['questions']
      }, {
        model: this.sequelize.models.DynamicQuestion,
        as: 'questions'
      }]
    });

    if (category) {
      const totalCount = await this.getTotalQuestionsCountRecursive(categoryId);
      await category.update({ total_questions_count: totalCount });

      // Update parent if exists
      if (category.parent_category_id) {
        await this.updateTotalQuestionsCount(category.parent_category_id);
      }
    }
  };

  DynamicCategory.getTotalQuestionsCountRecursive = async function(categoryId) {
    const category = await this.findByPk(categoryId, {
      include: [{
        model: this,
        as: 'subcategories'
      }, {
        model: this.sequelize.models.DynamicQuestion,
        as: 'questions'
      }]
    });

    if (!category) return 0;

    let totalCount = category.questions ? category.questions.length : 0;

    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        totalCount += await this.getTotalQuestionsCountRecursive(subcategory.id);
      }
    }

    return totalCount;
  };

  // Get full hierarchy tree
  DynamicCategory.getHierarchyTree = async function(testSeriesId, includeQuestions = false) {
    const includeOptions = [{
      model: this,
      as: 'subcategories',
      include: [{
        model: this,
        as: 'subcategories' // Nested subcategories
      }]
    }];

    if (includeQuestions) {
      includeOptions.push({
        model: this.sequelize.models.DynamicQuestion,
        as: 'questions',
        order: [['display_order', 'ASC']]
      });
    }

    return this.findAll({
      where: { 
        test_series_id: testSeriesId,
        parent_category_id: null // Root categories only
      },
      include: includeOptions,
      order: [['display_order', 'ASC']]
    });
  };

  return DynamicCategory;
};