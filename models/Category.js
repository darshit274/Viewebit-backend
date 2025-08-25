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
    name_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // NEW SIMPLIFIED HIERARCHY FIELDS
    node_type: {
      type: DataTypes.ENUM('unset', 'container', 'question_holder'),
      defaultValue: 'unset',
      allowNull: false
    },
    parent_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    tableName: 'categories',
    underscored: true,
    timestamps: true
  });

  Category.associate = function(models) {
    // Existing associations
    Category.belongsTo(models.TestSeries, { 
      foreignKey: 'test_series_id', 
      as: 'testSeries' 
    });
    Category.hasMany(models.SubCategory, { 
      foreignKey: 'category_id', 
      as: 'subCategories' 
    });

    // NEW SIMPLIFIED HIERARCHY ASSOCIATIONS
    // Self-referencing relationship for hierarchical structure
    Category.belongsTo(models.Category, {
      foreignKey: 'parent_category_id',
      as: 'parentCategory'
    });
    Category.hasMany(models.Category, {
      foreignKey: 'parent_category_id',
      as: 'childCategories'
    });

    // Direct relationship to questions (for question_holder categories)
    Category.hasMany(models.Question, {
      foreignKey: 'category_id',
      as: 'questions'
    });
  };

  return Category;
};