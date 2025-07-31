const { Admin } = require('./models');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Check if admin exists
    const existingAdmin = await Admin.findOne({ where: { email: 'admin@mocktail.com' } });
    
    if (!existingAdmin) {
      console.log('❌ Admin user does not exist. Creating...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await Admin.create({
        email: 'admin@mocktail.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'super_admin'
      });
      
      console.log('✅ Admin user created successfully:', admin.email);
    } else {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await existingAdmin.update({ password: hashedPassword });
      console.log('✅ Admin password updated');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
})();