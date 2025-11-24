const mongoose = require('mongoose');
const { User, Class, Subject, Unit, SubUnit, Lesson, Content } = require('./models');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined. Please configure MongoDB Atlas connection in api/.env file.');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB Atlas Connected for Seeding');

        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Class.deleteMany({}),
            Subject.deleteMany({}),
            Unit.deleteMany({}),
            SubUnit.deleteMany({}),
            Lesson.deleteMany({}),
            Content.deleteMany({})
        ]);

        console.log('Cleared existing data');

        // Users
        const admin = await User.create({
            username: 'admin',
            password: 'admin',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            role: 'admin',
            status: 'active',
            isFirstLogin: false,
            canEdit: true
        });

        const teacher = await User.create({
            username: 'bob',
            password: 'password123',
            name: 'Bob Williams',
            email: 'bob@example.com',
            role: 'teacher',
            status: 'active',
            isFirstLogin: true,
            canEdit: true
        });

        console.log('Created users:', { admin: admin.username, teacher: teacher.username });

        // Hierarchy
        const class10 = await Class.create({ name: 'Class 10' });
        const physics = await Subject.create({ name: 'Physics', classId: class10._id });
        const mechanics = await Unit.create({ name: 'Mechanics', subjectId: physics._id });
        const kinematics = await SubUnit.create({ name: 'Kinematics', unitId: mechanics._id });
        const newtonsLaws = await Lesson.create({ name: 'Newton\'s Laws', subUnitId: kinematics._id });

        // Content
        await Content.create({
            lessonId: newtonsLaws._id,
            type: 'notes',
            title: 'Intro to Newton\'s First Law',
            body: '<p>An object at rest stays at rest...</p>'
        });

        console.log('Database seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
