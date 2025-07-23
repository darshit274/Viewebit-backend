module.exports = (sequelize, DataTypes) => {
const FreeTest = sequelize.define('FreeTest', {
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
        comment: 'Free test title'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Test Classification
    test_type: {
        type: DataTypes.ENUM('practice', 'mock', 'sample', 'general'),
        allowNull: false,
        defaultValue: 'practice',
        comment: 'Type of free test'
    },
    
    // Subject/Topic
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subjects',
            key: 'id'
        }
    },
    
    subject_hierarchy_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subject_hierarchies',
            key: 'id'
        }
    },
    
    // Test Configuration
    total_questions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Test duration in minutes'
    },
    
    // Test Settings
    allows_pause_resume: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    negative_marking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    negative_marks: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0
    },
    
    // Multi-language Support
    supports_multilanguage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this test supports multiple languages'
    },
    
    // Instructions
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Status
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    tableName: 'free_tests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
FreeTest.associate = function(models) {
    FreeTest.belongsTo(models.Subject, { 
        foreignKey: 'subject_id', 
        as: 'subject' 
    });
    FreeTest.belongsTo(models.SubjectHierarchy, { 
        foreignKey: 'subject_hierarchy_id', 
        as: 'subjectHierarchy' 
    });
    FreeTest.hasMany(models.NewQuestion, { 
        foreignKey: 'test_id', 
        as: 'questions',
        constraints: false,
        scope: { test_type: 'free' }
    });
};

return FreeTest;
};