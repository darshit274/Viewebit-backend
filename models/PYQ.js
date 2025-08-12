module.exports = (sequelize, DataTypes) => {
const PYQ = sequelize.define('PYQ', {
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
        comment: 'PYQ title (e.g., "PSI 2023 Paper", "GPSC 2022 Prelims")'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Exam Information
    exam_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'exam_types',
            key: 'id'
        },
        comment: 'Which exam this PYQ belongs to'
    },
    
    exam_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Year of the exam (e.g., 2023, 2022)'
    },
    
    exam_session: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Session info (e.g., "Prelims", "Mains", "January", "July")'
    },
    
    // Paper Details
    paper_type: {
        type: DataTypes.ENUM('prelims', 'mains', 'full', 'sectional'),
        allowNull: false,
        defaultValue: 'full'
    },
    
    paper_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Paper number if multiple papers (Paper 1, Paper 2, etc.)'
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
        defaultValue: 120,
        comment: 'Original exam duration'
    },
    
    total_marks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100
    },
    
    // Test Settings (based on original exam pattern)
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
        defaultValue: false
    },
    
    // Original Exam Details
    original_exam_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date when the original exam was conducted'
    },
    
    conducting_authority: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Authority that conducted the exam (e.g., "GPSC", "Gujarat Police")'
    },
    
    // Instructions and Notes
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Original exam instructions'
    },
    
    exam_pattern_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes about the exam pattern, marking scheme, etc.'
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
        type: DataTypes.UUID,
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
    tableName: 'pyqs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
PYQ.associate = function(models) {
    PYQ.belongsTo(models.ExamType, { 
        foreignKey: 'exam_type_id', 
        as: 'examType' 
    });
    // Check if models exist before defining associations
    if (models.Question) {
        PYQ.hasMany(models.Question, { 
            foreignKey: 'test_id', 
            as: 'questions',
            constraints: false,
            scope: { test_type: 'pyq' }
        });
    }
    
    if (models.Admin) {
        PYQ.belongsTo(models.Admin, { 
            foreignKey: 'created_by', 
            as: 'creator' 
        });
    }
    
    // Removed UserAnswer association - pyq_id doesn't exist in user_answers table
};

return PYQ;
};