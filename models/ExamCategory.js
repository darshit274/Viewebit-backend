module.exports = (sequelize, DataTypes) => {
  const ExamCategory = sequelize.define('ExamCategory', {
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    name_gujarati: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hierarchy_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'exam_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  ExamCategory.associate = function(models) {
    // Self-referencing association for hierarchy
    ExamCategory.belongsTo(models.ExamCategory, {
      foreignKey: 'parent_id',
      as: 'parent'
    });

    ExamCategory.hasMany(models.ExamCategory, {
      foreignKey: 'parent_id',
      as: 'children'
    });

    // Test series in this category - commented out as new_test_series doesn't have category_id
    // ExamCategory.hasMany(models.TestSeries, {
    //   foreignKey: 'category_id',
    //   as: 'testSeries'
    // });
  };

  return ExamCategory;
};