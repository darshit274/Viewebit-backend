module.exports = (sequelize, DataTypes) => {
  const SubCategory = sequelize.define('SubCategory', {
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
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'sub_categories',
    underscored: true,
    timestamps: true
  });

  SubCategory.associate = function(models) {
    SubCategory.belongsTo(models.Category, { 
      foreignKey: 'category_id', 
      as: 'category' 
    });
    SubCategory.hasMany(models.Test, { 
      foreignKey: 'sub_category_id', 
      as: 'tests' 
    });
  };

  return SubCategory;
};