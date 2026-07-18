module.exports = (sequelize, DataTypes) => {
  const PdfCategory = sequelize.define('PdfCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Category name (e.g. Study Materials, Previous Papers)',
    },
    name_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    slug: {
      // Made nullable — nested admin-created categories don't need URL slugs
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'URL-friendly version of name (optional for sub-categories)',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Icon name for category display',
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#3B82F6',
      comment: 'Hex color code for category',
    },
    // ===== HIERARCHY FIELDS (mirrors categories table for test series) =====
    parent_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'NULL = root category; otherwise references pdf_categories.id',
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Depth from root: 0 = root, 1 = subcategory, …',
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Sibling order within the same parent (lower = shown first)',
    },
    node_type: {
      type: DataTypes.ENUM('unset', 'container', 'pdf_holder'),
      defaultValue: 'unset',
      allowNull: false,
      comment: 'unset = empty; container = has sub-categories; pdf_holder = contains PDFs directly',
    },
    // ===== PRICING (root categories only — mirrors TestSeries.pricing_type) =====
    pricing_type: {
      type: DataTypes.ENUM('free', 'paid', 'restricted'),
      defaultValue: 'free',
      allowNull: false,
      comment: 'Access for the whole category tree (root categories only)',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      allowNull: false,
      comment: 'Price for the whole category when pricing_type = paid',
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    // ===== LEGACY FIELDS (kept for backward compat) =====
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Legacy ordering field — new code should use display_order',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    educator_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Set when this node was authored by an Educator (Educator Panel PDF builder) rather than an Admin',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'pdf_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  PdfCategory.associate = function (models) {
    // Direct relationship to PDFs (leaf-level pdf_holder categories)
    PdfCategory.hasMany(models.Pdfs, {
      foreignKey: 'category_id',
      as: 'pdfs',
    });

    // Self-referencing tree
    PdfCategory.belongsTo(models.PdfCategory, {
      foreignKey: 'parent_category_id',
      as: 'parentCategory',
    });
    PdfCategory.hasMany(models.PdfCategory, {
      foreignKey: 'parent_category_id',
      as: 'childCategories',
    });
    if (models.Institution) {
      PdfCategory.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
    }
    if (models.Branch) {
      PdfCategory.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    }
    if (models.Department) {
      PdfCategory.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    }
    if (models.Educator) {
      PdfCategory.belongsTo(models.Educator, { foreignKey: 'educator_id', as: 'educator' });
    }
  };

  return PdfCategory;
};
