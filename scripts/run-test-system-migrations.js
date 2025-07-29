#!/usr/bin/env node

/**
 * Migration Runner for New Test System
 * This script runs all the new test system migrations in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Test System Migration...\n');

// List of migrations in correct order
const migrations = [
  '20250130000001-create-exam-categories.js',
  '20250130000002-create-test-series.js', 
  '20250130000003-create-tests.js',
  '20250130000004-create-questions.js',
  '20250130000005-create-test-sessions.js',
  '20250130000006-create-user-answers.js',
  '20250130000007-create-user-subscriptions.js',
  '20250130000008-create-test-analytics.js',
  '20250130000009-populate-sample-categories.js'
];

async function runMigrations() {
  try {
    console.log('📋 Migration Plan:');
    migrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration}`);
    });
    console.log('');

    // Check if sequelize-cli is available
    try {
      execSync('npx sequelize-cli --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('❌ Error: sequelize-cli not found. Please install it:');
      console.error('   npm install --save-dev sequelize-cli');
      process.exit(1);
    }

    // Run database migration
    console.log('🔄 Running migrations...');
    const result = execSync('npx sequelize-cli db:migrate', { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    console.log('✅ Migrations completed successfully!');
    console.log('\n📊 Migration Results:');
    console.log(result);
    
    console.log('\n🎉 Test System Database Setup Complete!');
    console.log('\n📚 What\'s been created:');
    console.log('   • Hierarchical exam categories (Exam-wise → Topic-wise → Chapter-wise)');
    console.log('   • Test series with multilingual support');
    console.log('   • Tests with pause/resume functionality'); 
    console.log('   • Questions with English + Gujarati content');
    console.log('   • Advanced test session management');
    console.log('   • User answer tracking with analytics');
    console.log('   • Subscription management system');
    console.log('   • Comprehensive analytics tables');
    console.log('   • Sample data for categories');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Update your frontend to use the new APIs');
    console.log('   2. Check the admin panel for test management');
    console.log('   3. Review TEST_SYSTEM_API_DOCS.md for API usage');
    console.log('   4. Start creating test series and questions!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check database connection settings');
    console.error('   2. Ensure database exists and is accessible');
    console.error('   3. Verify all required environment variables are set');
    console.error('   4. Check for any conflicting table names');
    process.exit(1);
  }
}

// Run the migrations
runMigrations();