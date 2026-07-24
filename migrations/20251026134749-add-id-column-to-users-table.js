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

    // Make id NOT NULL, AUTO_INCREMENT, and uniquely indexed in one statement (MySQL requires
    // an AUTO_INCREMENT column to already be a key as part of the same ALTER). Using a native
    // AUTO_INCREMENT instead of a trigger avoids needing SUPER privilege / binlog trust on
    // managed MySQL, and avoids the race condition in the old trigger's SELECT MAX(id)+1.
    await queryInterface.sequelize.query(
      'ALTER TABLE users MODIFY id INT NOT NULL AUTO_INCREMENT, ADD UNIQUE INDEX idx_users_id (id)'
    );

    // Make sure future auto-generated ids continue after the highest value just backfilled.
    const [rows] = await queryInterface.sequelize.query('SELECT IFNULL(MAX(id), 0) AS maxId FROM users');
    const nextId = Number(rows[0].maxId) + 1;
    await queryInterface.sequelize.query(`ALTER TABLE users AUTO_INCREMENT = ${nextId}`);
  },

  async down(queryInterface, Sequelize) {
    // Remove index (dropping the column implicitly drops AUTO_INCREMENT with it)
    await queryInterface.removeIndex('users', 'idx_users_id');

    // Remove id column
    await queryInterface.removeColumn('users', 'id');
  }
};
