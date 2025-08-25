module.exports = (sequelize, DataTypes) => {
const Subject = sequelize.define('Subject', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Subject name (e.g., "Mathematics", "NCERT", "General Knowledge")'
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Short code for subject (e.g., "MATH", "NCERT", "GK")'
    },
    has_hierarchy: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this subject has hierarchical structure (like NCERT with classes)'
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
    tableName: 'subjects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

Subject.associate = function(models) {
    Subject.hasMany(models.SubjectHierarchy, { 
        foreignKey: 'subject_id', 
        as: 'hierarchies' 
    });
    // Note: TestSeries uses category_id instead of subject_id
    // if (models.TestSeries) {
    //     Subject.hasMany(models.TestSeries, { 
    //         foreignKey: 'subject_id', 
    //         as: 'testSeries' 
    //     });
    // }
    
    if (models.FreeTest) {
        Subject.hasMany(models.FreeTest, { 
            foreignKey: 'subject_id', 
            as: 'freeTests' 
        });
    }
};

return Subject;
};