'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const categories = [
      {
        name: 'Study Materials',
        slug: 'study-materials',
        description: 'General study materials, notes, and learning resources',
        icon: 'book',
        color: '#3B82F6',
        sort_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Previous Year Papers',
        slug: 'previous-year-papers',
        description: 'Previous year question papers and their solutions',
        icon: 'file-text',
        color: '#10B981',
        sort_order: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Mock Tests',
        slug: 'mock-tests',
        description: 'Practice tests and mock examinations',
        icon: 'clipboard-check',
        color: '#F59E0B',
        sort_order: 3,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Reference Books',
        slug: 'reference-books',
        description: 'Reference books and academic literature',
        icon: 'book-open',
        color: '#8B5CF6',
        sort_order: 4,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Quick Revision',
        slug: 'quick-revision',
        description: 'Quick revision notes and summaries',
        icon: 'zap',
        color: '#EF4444',
        sort_order: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Syllabus & Guidelines',
        slug: 'syllabus-guidelines',
        description: 'Official syllabus and examination guidelines',
        icon: 'list-checks',
        color: '#6B7280',
        sort_order: 6,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Current Affairs',
        slug: 'current-affairs',
        description: 'Current affairs and general knowledge materials',
        icon: 'newspaper',
        color: '#06B6D4',
        sort_order: 7,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Formula Sheets',
        slug: 'formula-sheets',
        description: 'Important formulas and quick reference sheets',
        icon: 'calculator',
        color: '#84CC16',
        sort_order: 8,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('pdf_categories', categories, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('pdf_categories', {
      slug: [
        'study-materials',
        'previous-year-papers',
        'mock-tests',
        'reference-books',
        'quick-revision',
        'syllabus-guidelines',
        'current-affairs',
        'formula-sheets'
      ]
    }, {});
  }
};
