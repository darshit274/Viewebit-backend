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
      unique: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    title_gujarati: {
      type: DataTypes.STRING(400),
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
    
    // Hierarchical categorization
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    exam_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parent_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hierarchy_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    
    // Pricing and access
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    original_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR'
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    free_test_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Content structure
    total_tests: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    estimated_duration: {
      type: DataTypes.INTEGER
    },
    
    // Test configuration
    difficulty_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert', 'mixed'),
      defaultValue: 'mixed'
    },
    access_duration_days: {
      type: DataTypes.INTEGER
    },
    max_attempts_per_test: {
      type: DataTypes.INTEGER
    },
    
    // Features
    supports_pause_resume: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    supports_multilanguage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    has_negative_marking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    negative_marks: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.25
    },
    
    // Content and instructions
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    learning_outcomes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // SEO and display
    slug: {
      type: DataTypes.STRING(200),
      unique: true,
      allowNull: true
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON
    },
    
    // Status and visibility
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Analytics
    total_enrollments: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Admin tracking
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    tableName: 'test_series',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  TestSeries.associate = function(models) {
    // Category association
    TestSeries.belongsTo(models.ExamCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // Exam type association
    TestSeries.belongsTo(models.ExamType, {
      foreignKey: 'exam_type_id',
      as: 'examType'
    });

    // Self-referencing for hierarchical series
    TestSeries.belongsTo(models.TestSeries, {
      foreignKey: 'parent_series_id',
      as: 'parentSeries'
    });

    TestSeries.hasMany(models.TestSeries, {
      foreignKey: 'parent_series_id',
      as: 'childSeries'
    });

    // Admin who created this series
    TestSeries.belongsTo(models.Admin, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // Tests in this series
    TestSeries.hasMany(models.Test, {
      foreignKey: 'test_series_id',
      as: 'tests'
    });

    // User subscriptions
    TestSeries.hasMany(models.UserSubscription, {
      foreignKey: 'test_series_id',
      as: 'subscriptions'
    });

    // Test sessions
    TestSeries.hasMany(models.TestSession, {
      foreignKey: 'test_series_id',
      as: 'sessions'
    });

    // Analytics
    TestSeries.hasMany(models.TestAnalytics, {
      foreignKey: 'test_series_id',
      as: 'analytics'
    });
  };

  return TestSeries;
};