module.exports = (sequelize, DataTypes) => {
  const NewTest = sequelize.define('NewTest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    title_gujarati: {
      type: DataTypes.STRING(400),
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
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    test_type: {
      type: DataTypes.ENUM('practice', 'mock', 'assessment', 'sample', 'full_length', 'previous_year', 'sectional'),
      defaultValue: 'practice'
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    total_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    passing_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    is_one_time: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    allows_pause: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    has_negative_marking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    negative_marks: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00
    },
    marks_per_question: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    available_from: {
      type: DataTypes.DATE,
      allowNull: true
    },
    available_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    show_results_immediately: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    show_correct_answers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    show_explanations: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    supports_multilanguage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    randomize_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    randomize_options: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: true,
      unique: true
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_completions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    average_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    average_time_taken: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    highest_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    lowest_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    pass_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    created_by: {
      type: DataTypes.CHAR(36),
      allowNull: true
    }
  }, {
    tableName: 'new_tests',
    underscored: true,
    timestamps: true
  });

  NewTest.associate = function(models) {
    NewTest.hasMany(models.TestSession, {
      foreignKey: 'test_id',
      as: 'sessions'
    });
    NewTest.hasMany(models.UserAnswer, {
      foreignKey: 'test_id',
      as: 'answers'
    });
    NewTest.hasMany(models.LeaderboardEntry, {
      foreignKey: 'test_id',
      as: 'leaderboardEntries'
    });
    NewTest.hasMany(models.Question, {
      foreignKey: 'test_id',
      as: 'questions'
    });
  };

  return NewTest;
};