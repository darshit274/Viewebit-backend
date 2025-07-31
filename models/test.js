module.exports = (sequelize, DataTypes) => {
  const Test = sequelize.define('Test', {
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
    sub_category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title_gujarati: {
      type: DataTypes.STRING,
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
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    },
    total_marks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_demo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_free_in_paid_series: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    negative_marking_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    negative_marks_per_wrong: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.25,
      allowNull: false
    },
    is_one_time_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    max_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    attempt_restrictions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    passing_marks: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'tests',
    underscored: true,
    timestamps: true
  });

  Test.associate = function(models) {
    Test.belongsTo(models.SubCategory, { 
      foreignKey: 'sub_category_id', 
      as: 'subCategory' 
    });
    Test.hasMany(models.Question, { 
      foreignKey: 'test_id', 
      as: 'questions' 
    });
  };

  return Test;
};