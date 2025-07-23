'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Admin_Modules extends Model {
    static associate(models) {
     
    }
  }
  Admin_Modules.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false, // required field for the module title
    },
    

    }, {
    sequelize,
    modelName: 'Admin_Modules',
    tableName: 'admin_modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Admin_Modules;
};
