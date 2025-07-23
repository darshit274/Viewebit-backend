module.exports = (sequelize, DataTypes) => {
const ExamType = sequelize.define('ExamType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Exam name (e.g., "Deputy Section Officer", "PSI", "GPSC")'
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Short code for exam (e.g., "DSO", "PSI", "GPSC")'
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
    tableName: 'exam_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
ExamType.associate = function(models) {
    ExamType.hasMany(models.NewTestSeries, { 
        foreignKey: 'exam_type_id', 
        as: 'testSeries' 
    });
    ExamType.hasMany(models.PYQ, { 
        foreignKey: 'exam_type_id', 
        as: 'pyqs' 
    });
};

return ExamType;
};