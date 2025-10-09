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
      type: DataTypes.ENUM('free', 'paid'),
      defaultValue: 'free',
      allowNull: false
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
  };

  return TestSeries;
};