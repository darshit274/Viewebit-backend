'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define associations here (e.g., User.hasMany(Post))
    }
  }

  User.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true // optional
    },
    otp :{
      type: DataTypes.INTEGER,
      allowNull: true

    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true // optional, if you want to store phone numbers
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true, // enables createdAt and updatedAt
    // underscored: true // maps to created_at and updated_at in DB
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};
