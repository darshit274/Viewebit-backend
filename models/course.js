'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
     
    }
  }
  Course.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
        allowNull: false,

    },
    description: {
      type: DataTypes.TEXT,
        allowNull: false
    },
    price: {
      type: DataTypes.DOUBLE,
        allowNull: false,       
    },
    }, {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Course;
};
