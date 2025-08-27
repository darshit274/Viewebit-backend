'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if pdfs table exists
    const tableExists = await queryInterface.tableExists('pdfs');
    
    if (!tableExists) {
      await queryInterface.createTable('pdfs', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Display title for the PDF'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'pdf_categories',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Server path to the PDF file'
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename when uploaded'
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'File size in bytes'
      },
      mime_type: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'application/pdf',
        comment: 'MIME type of the file'
      },
      access_level: {
        type: Sequelize.ENUM('free', 'premium', 'restricted'),
        allowNull: true,
        defaultValue: 'free',
        comment: 'Who can access this PDF'
      },
      test_series_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        comment: 'Link to specific test series if applicable'
      },
      exam_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Link to exam type if applicable',
        references: {
          model: 'exam_types',
          key: 'id'
        }
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of tags for better search'
      },
      download_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of times downloaded'
      },
      view_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of times viewed'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      uploaded_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        comment: 'Admin who uploaded this PDF'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
      });

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex('pdfs', ['category_id'], { name: 'pdfs_category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_category_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['test_series_id'], { name: 'pdfs_test_series_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_test_series_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['exam_type_id'], { name: 'pdfs_exam_type_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_exam_type_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['access_level'], { name: 'pdfs_access_level' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_access_level already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['is_active'], { name: 'pdfs_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_is_active already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['is_featured'], { name: 'pdfs_is_featured' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_is_featured already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['created_at'], { name: 'pdfs_created_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_created_at already exists, skipping...');
      }
    } else {
      console.log('pdfs table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('pdfs', ['category_id'], { name: 'pdfs_category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_category_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['test_series_id'], { name: 'pdfs_test_series_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_test_series_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['exam_type_id'], { name: 'pdfs_exam_type_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_exam_type_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['access_level'], { name: 'pdfs_access_level' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_access_level already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['is_active'], { name: 'pdfs_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_is_active already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['is_featured'], { name: 'pdfs_is_featured' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_is_featured already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdfs', ['created_at'], { name: 'pdfs_created_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdfs_created_at already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdfs');
  }
};