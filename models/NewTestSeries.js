module.exports = (sequelize, DataTypes) => {
const NewTestSeries = sequelize.define('NewTestSeries', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Test series title'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Series Type and Classification
    series_type: {
        type: DataTypes.ENUM('exam_wise', 'topic_wise', 'subject_wise'),
        allowNull: false,
        comment: 'Type of test series based on documentation'
    },
    
    // For exam-wise series
    exam_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'exam_types',
            key: 'id'
        },
        comment: 'Reference to exam type for exam-wise series'
    },
    
    // For topic-wise/subject-wise series
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subjects',
            key: 'id'
        },
        comment: 'Reference to subject for topic/subject-wise series'
    },
    
    subject_hierarchy_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subject_hierarchies',
            key: 'id'
        },
        comment: 'Reference to specific hierarchy level (class/chapter)'
    },
    
    // Pricing
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    original_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Original price before discount'
    },
    
    // Test Configuration
    total_tests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of tests in this series'
    },
    free_tests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of free tests for evaluation'
    },
    
    // Duration and Access
    duration_months: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,
        comment: 'Access duration in months'
    },
    
    // Test Settings
    allows_pause_resume: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether tests in this series allow pause/resume'
    },
    negative_marking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    negative_marks: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0,
        comment: 'Negative marks per wrong answer'
    },
    
    // Instructions and Details
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed instructions for the test series'
    },
    exam_pattern: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Exam pattern description'
    },
    syllabus_covered: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Topics/syllabus covered in this series'
    },
    
    // Status and Metadata
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether to feature this series prominently'
    },
    
    // Admin Information
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admins',
            key: 'id'
        }
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
    tableName: 'new_test_series',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
NewTestSeries.associate = function(models) {
    NewTestSeries.belongsTo(models.ExamType, { 
        foreignKey: 'exam_type_id', 
        as: 'examType' 
    });
    NewTestSeries.belongsTo(models.Subject, { 
        foreignKey: 'subject_id', 
        as: 'subject' 
    });
    NewTestSeries.belongsTo(models.SubjectHierarchy, { 
        foreignKey: 'subject_hierarchy_id', 
        as: 'subjectHierarchy' 
    });
    NewTestSeries.hasMany(models.NewQuestion, { 
        foreignKey: 'test_id', 
        as: 'questions',
        constraints: false,
        scope: { test_type: 'series' }
    });
};

return NewTestSeries;
};