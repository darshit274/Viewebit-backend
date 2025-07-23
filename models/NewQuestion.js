module.exports = (sequelize, DataTypes) => {
const NewQuestion = sequelize.define('NewQuestion', {
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
    
    // Question Association
    test_series_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'new_test_series',
            key: 'id'
        }
    },
    free_test_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'free_tests',
            key: 'id'
        }
    },
    pyq_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pyqs',
            key: 'id'
        }
    },
    
    // Question Content (Primary Language - English)
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Question text in primary language (English)'
    },
    
    // Answer Options (Primary Language)
    option_a: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    option_b: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    option_c: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    option_d: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    
    // Correct Answer
    correct_answer: {
        type: DataTypes.ENUM('A', 'B', 'C', 'D'),
        allowNull: false
    },
    
    // Explanation (Primary Language)
    explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed explanation of the correct answer'
    },
    
    // Question Metadata
    difficulty: {
        type: DataTypes.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium'
    },
    
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subjects',
            key: 'id'
        }
    },
    
    topic: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Specific topic within the subject'
    },
    
    // Marking Scheme
    marks: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1,
        comment: 'Marks for correct answer'
    },
    
    negative_marks: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Negative marks for wrong answer'
    },
    
    // Multi-language Support
    supports_multilanguage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this question has translations'
    },
    
    // Question Order and Display
    question_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Question number within the test'
    },
    
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for displaying questions'
    },
    
    // Additional Features
    image_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to question image if any'
    },
    
    reference_pdf_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pdfs',
            key: 'id'
        },
        comment: 'Reference to related PDF for integrated reading'
    },
    
    // Question Source (for PYQs)
    source_exam: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Source exam name for PYQ questions'
    },
    
    source_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Source exam year for PYQ questions'
    },
    
    // Status
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
    tableName: 'new_questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
NewQuestion.associate = function(models) {
    NewQuestion.hasMany(models.QuestionTranslation, { 
        foreignKey: 'question_id', 
        as: 'translations' 
    });
};

return NewQuestion;
};