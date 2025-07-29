module.exports = (sequelize, DataTypes) => {
  const UserSubscription = sequelize.define('UserSubscription', {
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
    
    // Associations
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    
    // Subscription details
    subscription_type: {
      type: DataTypes.ENUM('free', 'paid', 'premium', 'trial', 'gifted'),
      defaultValue: 'free'
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled', 'paused', 'pending'),
      defaultValue: 'active'
    },
    
    // Pricing
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR'
    },
    
    // Access control
    starts_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    max_attempts_per_test: {
      type: DataTypes.INTEGER
    },
    
    // Payment tracking
    payment_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      allowNull: true
    },
    
    // Usage tracking
    tests_attempted: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    tests_completed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Admin notes and tracking
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
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
    tableName: 'user_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  UserSubscription.associate = function(models) {
    // User association
    UserSubscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Test series association
    UserSubscription.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });

    // Admin who created this subscription
    UserSubscription.belongsTo(models.Admin, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return UserSubscription;
};