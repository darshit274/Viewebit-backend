module.exports = (sequelize, DataTypes) => {
const NewPdf = sequelize.define('NewPdf', {
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
    
    // Basic Information
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'PDF title'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // PDF Classification
    pdf_type: {
        type: DataTypes.ENUM('standalone', 'test_linked', 'reference', 'study_material'),
        allowNull: false,
        defaultValue: 'standalone',
        comment: 'Type of PDF based on usage'
    },
    
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'PDF category (Study Material, Previous Papers, etc.)'
    },
    
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subjects',
            key: 'id'
        }
    },
    
    // Test Associations (for test-linked PDFs)
    test_series_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'new_test_series',
            key: 'id'
        },
        comment: 'Associated test series if linked'
    },
    
    free_test_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'free_tests',
            key: 'id'
        },
        comment: 'Associated free test if linked'
    },
    
    pyq_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pyqs',
            key: 'id'
        },
        comment: 'Associated PYQ if linked'
    },
    
    // File Information
    file_url: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL to the PDF file'
    },
    
    file_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Original file name'
    },
    
    file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'File size in bytes'
    },
    
    total_pages: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total number of pages in PDF'
    },
    
    // Access Control
    is_free: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether PDF is free or premium'
    },
    
    required_purchase: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user needs to purchase associated test series to access'
    },
    
    // Usage for Integrated Reading
    reading_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated reading time in minutes'
    },
    
    preview_pages: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        comment: 'Number of pages available for preview'
    },
    
    // Metadata
    author: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'PDF author or source'
    },
    
    publication_year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'English',
        comment: 'Primary language of the PDF'
    },
    
    tags: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comma-separated tags for search'
    },
    
    // Analytics
    download_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of times downloaded'
    },
    
    view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of times viewed'
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
    uploaded_by: {
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
    tableName: 'new_pdfs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
NewPdf.associate = function(models) {
    NewPdf.belongsTo(models.ExamType, { 
        foreignKey: 'exam_type_id', 
        as: 'examType' 
    });
    NewPdf.belongsTo(models.Subject, { 
        foreignKey: 'subject_id', 
        as: 'subject' 
    });
    NewPdf.belongsTo(models.SubjectHierarchy, { 
        foreignKey: 'subject_hierarchy_id', 
        as: 'subjectHierarchy' 
    });
};

return NewPdf;
};