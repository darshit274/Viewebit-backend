module.exports = (sequelize, DataTypes) => {
  const SubscriptionAccessLog = sequelize.define('SubscriptionAccessLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    access_granted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    access_reason: {
      type: DataTypes.ENUM('free_content', 'demo_access', 'subscription_active', 'admin_override', 'access_denied'),
      allowNull: false
    },
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    denial_reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_ip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    accessed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  }, {
    tableName: 'subscription_access_logs',
    underscored: true,
    timestamps: true
  });

  SubscriptionAccessLog.associate = function(models) {
    SubscriptionAccessLog.belongsTo(models.User, { 
      foreignKey: 'user_id', 
      as: 'user' 
    });
    SubscriptionAccessLog.belongsTo(models.TestSeries, { 
      foreignKey: 'test_series_id', 
      as: 'testSeries' 
    });
    SubscriptionAccessLog.belongsTo(models.Test, { 
      foreignKey: 'test_id', 
      as: 'test' 
    });
    SubscriptionAccessLog.belongsTo(models.Subscription, { 
      foreignKey: 'subscription_id', 
      as: 'subscription' 
    });
  };

  return SubscriptionAccessLog;
};