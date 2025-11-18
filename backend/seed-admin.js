import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedAdminUser() {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    let adminUser = await User.findOne({ username: 'admin' });
    
    if (adminUser) {
      console.log('Admin user already exists:');
      console.log(`- Name: ${adminUser.name}`);
      console.log(`- Username: ${adminUser.username}`);
      console.log(`- Email: ${adminUser.email}`);
      console.log(`- Role: ${adminUser.role}`);
      console.log(`- Status: ${adminUser.status}`);
    } else {
      // Create admin user
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        username: 'admin',
        password: '@12345678',
        role: 'admin',
        status: 'active',
        isFirstLogin: false
      });
      
      await adminUser.save();
      console.log('Admin user created successfully!');
    }

    // List all users
    const allUsers = await User.find().select('-password');
    console.log(`\nTotal users in database: ${allUsers.length}`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username}) - Role: ${user.role} - Status: ${user.status}`);
    });

  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
seedAdminUser();