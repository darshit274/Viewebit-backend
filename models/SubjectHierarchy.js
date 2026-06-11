module.exports = (sequelize, DataTypes) => {
const SubjectHierarchy = sequelize.define('SubjectHierarchy', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'id'
        }
    },
    level_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Level name (e.g., "Class 6", "Class 7", "Chapter 1")'
    },
    level_type: {
        type: DataTypes.ENUM('standard', 'class', 'chapter', 'topic'),
        allowNull: false,
        comment: 'Type of hierarchy level'
    },
    parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subject_hierarchies',
            key: 'id'
        },
        comment: 'Parent hierarchy for nested structure (e.g., Chapter belongs to Class)'
    },
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for displaying items'
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
    tableName: 'subject_hierarchies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
SubjectHierarchy.associate = function(models) {
    SubjectHierarchy.belongsTo(models.Subject, { 
        foreignKey: 'subject_id', 
        as: 'subject' 
    });
    SubjectHierarchy.belongsTo(models.SubjectHierarchy, { 
        foreignKey: 'parent_id', 
        as: 'parent' 
    });
    SubjectHierarchy.hasMany(models.SubjectHierarchy, { 
        foreignKey: 'parent_id', 
        as: 'children' 
    });
    // Note: TestSeries uses category_id instead of subject_hierarchy_id
    // if (models.TestSeries) {
    //     SubjectHierarchy.hasMany(models.TestSeries, { 
    //         foreignKey: 'subject_hierarchy_id', 
    //         as: 'testSeries' 
    //     });
    // }
    
    if (models.FreeTest) {
        SubjectHierarchy.hasMany(models.FreeTest, { 
            foreignKey: 'subject_hierarchy_id', 
            as: 'freeTests' 
        });
    }
};

return SubjectHierarchy;
};