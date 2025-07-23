'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Admin_Priviledge extends Model {
    static associate(models) {
     
    }
  }
  Admin_Priviledge.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,

        primaryKey: true
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'admin_user_role', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    module_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'admin_modules', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    is_add: {

        type: DataTypes.BOOLEAN,
        allowNull: false, // required field to indicate if add priviledge is granted
    },
    is_edit: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // required field to indicate if edit priviledge is granted
    },
    is_delete: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // required field to indicate if delete priviledge is granted
    },
    is_view: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // required field to indicate if view priviledge is granted
    },

    }, {
    sequelize,
    modelName: 'Admin_Priviledge',
    tableName: 'admin_priviledge',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Admin_Priviledge;
};
