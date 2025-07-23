module.exports = (sequelize, DataTypes) => {
const QuestionTranslation = sequelize.define('QuestionTranslation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'new_questions',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    
    // Language Information
    language_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Language code (e.g., "hi", "gu", "ta", "bn")'
    },
    
    language_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Full language name (e.g., "Hindi", "Gujarati", "Tamil")'
    },
    
    // Translated Question Content
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Question text in this language'
    },
    
    // Translated Answer Options
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
    
    // Translated Explanation
    explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Explanation in this language'
    },
    
    // Translation Quality and Status
    translation_status: {
        type: DataTypes.ENUM('draft', 'review', 'approved', 'published'),
        defaultValue: 'draft',
        comment: 'Status of translation'
    },
    
    quality_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Translation quality score (1-10)'
    },
    
    // Translator Information
    translated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admins',
            key: 'id'
        },
        comment: 'Admin who did the translation'
    },
    
    reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admins',
            key: 'id'
        },
        comment: 'Admin who reviewed the translation'
    },
    
    // Timestamps
    translated_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    
    reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true
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
    tableName: 'question_translations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['question_id', 'language_code']
        }
    ]
});

// Define associations
QuestionTranslation.associate = function(models) {
    QuestionTranslation.belongsTo(models.NewQuestion, { 
        foreignKey: 'question_id', 
        as: 'question' 
    });
};

return QuestionTranslation;
};