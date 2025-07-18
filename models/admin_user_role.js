'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Admin_User_Role extends Model {
    static associate(models) {
     
    }
  }
  Admin_User_Role.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    role_title: {
        type: DataTypes.STRING,
        allowNull: false, // required field for the role title
    },
    

    }, {
    sequelize,
    modelName: 'Admin_User_Role',
    tableName: 'admin_user_role',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Admin_User_Role;
};
