module.exports = (sequelize, DataTypes) => {
  const TestSeries = sequelize.define('TestSeries', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name_gujarati: {
      type: DataTypes.TEXT,
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
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    pricing_type: {
      type: DataTypes.ENUM('free', 'paid', 'previous_years_question_papers'),
      defaultValue: 'free',
      allowNull: false,
      comment: 'Type of test series: free, paid, or previous years question papers'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'INR',
      allowNull: false
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    // Additional fields that exist in the table
    difficulty_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      defaultValue: 'beginner',
      allowNull: false
    },
    free_test_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    max_attempts_per_test: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    // Negative marking moved to category level
    // has_negative_marking: removed - now handled at category level
    // negative_marks: removed - now handled at category level
    supports_pause_resume: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    supports_multilanguage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    validity_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 365,
      comment: 'Number of days the course is valid after purchase'
    },
    is_course_closed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'When true, prevents new enrollments for this course'
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Controls display position in app and web — lower number shown first'
    },
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'new_test_series',
    underscored: true,
    timestamps: true
  });

  TestSeries.associate = function(models) {
    TestSeries.hasMany(models.Category, {
      foreignKey: 'test_series_id',
      as: 'categories'
    });
    if (models.Institution) {
      TestSeries.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
    }
    if (models.Branch) {
      TestSeries.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    }
    if (models.Department) {
      TestSeries.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    }
    if (models.Course) {
      TestSeries.hasOne(models.Course, { foreignKey: 'test_series_id', as: 'course' });
    }
  };

  return TestSeries;
};