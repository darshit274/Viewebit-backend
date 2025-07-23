module.exports = (sequelize, DataTypes) => {
const TestSeriesCategory = sequelize.define('TestSeriesCategory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Category name (e.g., "Exam-wise", "Topic-wise", "Subject-wise")'
    },
    type: {
        type: DataTypes.ENUM('exam_wise', 'topic_wise', 'subject_wise'),
        allowNull: false,
        comment: 'Type of category for different organizational structures'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'test_series_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
TestSeriesCategory.associate = function(models) {
    TestSeriesCategory.hasMany(models.NewTestSeries, { 
        foreignKey: 'category_id', 
        as: 'testSeries' 
    });
};

return TestSeriesCategory;
};