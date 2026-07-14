const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ContactQuery = sequelize.define('ContactQuery', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Full name is required'
        },
        len: {
          args: [2, 100],
          msg: 'Full name must be between 2 and 100 characters'
        }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address'
        },
        notEmpty: {
          msg: 'Email is required'
        }
      }
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Mobile number is required'
        },
        is: {
          args: /^[0-9]{10,15}$/,
          msg: 'Mobile number must be 10-15 digits'
        }
      }
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    institution_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    query_message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Query message is required'
        },
        len: {
          args: [10, 5000],
          msg: 'Query message must be between 10 and 5000 characters'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'viewed', 'solved'),
      defaultValue: 'pending',
      allowNull: false,
      validate: {
        isIn: {
          args: [['pending', 'viewed', 'solved']],
          msg: 'Status must be pending, viewed, or solved'
        }
      }
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 5000],
          msg: 'Admin notes must not exceed 5000 characters'
        }
      }
    },
    viewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    viewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    solved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    solved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'contact_queries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['mobile_number'] }
    ]
  });

  ContactQuery.associate = function(models) {
    // Association with Admin model for viewed_by
    ContactQuery.belongsTo(models.Admin, {
      as: 'viewedByAdmin',
      foreignKey: 'viewed_by',
      constraints: false
    });

    // Association with Admin model for solved_by
    ContactQuery.belongsTo(models.Admin, {
      as: 'solvedByAdmin',
      foreignKey: 'solved_by',
      constraints: false
    });
  };

  return ContactQuery;
};
