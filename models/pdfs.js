'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pdfs extends Model {
    static associate(models) {
     
    }
  }
  Pdfs.init({

    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'test', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false, // required field for the name of the PDF file
    },
    file_path: {

        type: DataTypes.STRING,
        allowNull: false, // required field for the path to the PDF file
    }
    }, {
    sequelize,
    modelName: 'Pdfs',
    tableName: 'pdfs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Pdfs;
};
