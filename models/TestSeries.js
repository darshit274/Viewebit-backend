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
    demo_tests_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    subscription_duration_days: {
      type: DataTypes.INTEGER,
      defaultValue: 365,
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
    // New advanced test features
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the test series is free or paid'
    },
    free_tests_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of free tests in paid series'
    },
    requires_subscription: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether series requires subscription to access'
    },
    negative_marking_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether negative marking is enabled for this series'
    },
    negative_marking_value: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.25,
      allowNull: true,
      comment: 'Negative marking value (e.g., 0.25, 0.20, 0.33)'
    },
    one_time_completion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether tests can be taken only once'
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Maximum attempts allowed per test'
    },
    auto_submit_on_expire: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Auto submit test when time expires'
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