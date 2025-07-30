module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
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
    test_series_id: {
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
    tableName: 'categories',
    underscored: true,
    timestamps: true
  });

  Category.associate = function(models) {
    Category.belongsTo(models.TestSeries, { 
      foreignKey: 'test_series_id', 
      as: 'testSeries' 
    });
    Category.hasMany(models.SubCategory, { 
      foreignKey: 'category_id', 
      as: 'subCategories' 
    });
  };

  return Category;
};