'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add id column as regular INTEGER (not AUTO_INCREMENT)
    // Note: uuid will remain as primary key, but id is needed for foreign key relationships
    await queryInterface.addColumn('users', 'id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily allow null while we populate
      after: 'uuid' // Add after uuid column (MySQL specific)
    });

    // Populate id column with sequential values for existing users
    await queryInterface.sequelize.query('SET @count = 0;');
    await queryInterface.sequelize.query('UPDATE users SET id = @count:= @count + 1 ORDER BY created_at;');

    // Now make id NOT NULL
    await queryInterface.changeColumn('users', 'id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    // Add unique index on id
    await queryInterface.addIndex('users', ['id'], {
      name: 'idx_users_id',
      unique: true
    });

    // Create trigger to auto-populate id for new users
    await queryInterface.sequelize.query(`
      CREATE TRIGGER before_user_insert
      BEFORE INSERT ON users
      FOR EACH ROW
      BEGIN
        IF NEW.id IS NULL THEN
          SET NEW.id = (SELECT IFNULL(MAX(id), 0) + 1 FROM users);
        END IF;
      END;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop trigger
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS before_user_insert');

    // Remove index
    await queryInterface.removeIndex('users', 'idx_users_id');

    // Remove id column
    await queryInterface.removeColumn('users', 'id');
  }
};
