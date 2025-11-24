const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const cleanDatabase = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB Atlas');
        console.log('✓ Database:', mongoose.connection.name);

        // Drop the entire database to ensure clean state
        await mongoose.connection.dropDatabase();
        console.log('✓ Database dropped completely');

        console.log('\nDatabase is now completely empty and ready for seeding.');
        console.log('Run: node seed.js');

        process.exit(0);
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
};

cleanDatabase();
