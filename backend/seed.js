import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from './config/database.js';

// Import models
import User from './models/User.js';
import Class from './models/Class.js';
import Subject from './models/Subject.js';
import Unit from './models/Unit.js';
import SubUnit from './models/SubUnit.js';
import Lesson from './models/Lesson.js';
import Content from './models/Content.js';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany();
    await Class.deleteMany();
    await Subject.deleteMany();
    await Unit.deleteMany();
    await SubUnit.deleteMany();
    await Lesson.deleteMany();
    await Content.deleteMany();

    console.log('✅ Cleared existing data');

    // Create classes
    const class1 = await Class.create({ name: 'Class 10' });
    const class2 = await Class.create({ name: 'Class 12' });

    console.log('✅ Created classes');

    // Create subjects
    const physics = await Subject.create({ name: 'Physics', classId: class1._id });
    const chemistry = await Subject.create({ name: 'Chemistry', classId: class1._id });
    const mathematics = await Subject.create({ name: 'Mathematics', classId: class2._id });

    console.log('✅ Created subjects');

    // Create units
    const mechanics = await Unit.create({ name: 'Mechanics', subjectId: physics._id });
    const optics = await Unit.create({ name: 'Optics', subjectId: physics._id });
    const organicChemistry = await Unit.create({ name: 'Organic Chemistry', subjectId: chemistry._id });
    const calculus = await Unit.create({ name: 'Calculus', subjectId: mathematics._id });

    console.log('✅ Created units');

    // Create sub-units
    const kinematics = await SubUnit.create({ name: 'Kinematics', unitId: mechanics._id });
    const geometricalOptics = await SubUnit.create({ name: 'Geometrical Optics', unitId: optics._id });
    const hydrocarbons = await SubUnit.create({ name: 'Hydrocarbons', unitId: organicChemistry._id });
    const integration = await SubUnit.create({ name: 'Integration', unitId: calculus._id });

    console.log('✅ Created sub-units');

    // Create lessons
    const newtonsLaws = await Lesson.create({ name: 'Newton\'s Laws', subUnitId: kinematics._id });
    const workEnergy = await Lesson.create({ name: 'Work and Energy', subUnitId: kinematics._id });
    const reflection = await Lesson.create({ name: 'Reflection', subUnitId: geometricalOptics._id });
    const refraction = await Lesson.create({ name: 'Refraction', subUnitId: geometricalOptics._id });
    const alkanes = await Lesson.create({ name: 'Alkanes', subUnitId: hydrocarbons._id });
    const derivatives = await Lesson.create({ name: 'Derivatives', subUnitId: integration._id });

    console.log('✅ Created lessons');

    // Create contents
    const sampleQuizData = JSON.stringify([
      {
        question: "கல்பனா சாவ்லாவின் இரண்டு விண்வெளிப் பயணங்களுக்கும் பயன்படுத்தப்பட்ட விண்கலத்தின் பெயர் என்ன?",
        answerOptions: [
          {
            text: "கொலம்பியா",
            isCorrect: true,
            rationale: "பாடப்பகுதியின்படி, கல்பனா சாவ்லாவின் முதல் மற்றும் இரண்டாவது பயணங்கள் முறையே கொலம்பியா எஸ்.டி.எஸ்.87 மற்றும் கொலம்பியா எஸ்.டி.எஸ்.107 விண்கலங்களில் மேற்கொள்ளப்பட்டன."
          },
          {
            text: "சேலஞ்சர்",
            isCorrect: false,
            rationale: "சேலஞ்சர் என்பது நாசாவின் மற்றொரு விண்கலமாகும், ஆனால் இது கல்பனாவின் பயணங்களுடன் தொடர்புடையது அல்ல."
          },
          {
            text: "டிஸ்கவரி",
            isCorrect: false,
            rationale: "டிஸ்கவரி நாசாவின் விண்கலங்களில் ஒன்றாகும், ஆனால் பாடப்பகுதியில் கல்பனா சாவ்லா இதைப் பயன்படுத்தியதாகக் குறிப்பிடப்படவில்லை."
          },
          {
            text: "அட்லாண்டிஸ்",
            isCorrect: false,
            rationale: "அட்லாண்டிஸ் நாசாவின் ஒரு முக்கியமான விண்கலமாக இருந்தாலும், கல்பனாவின் பயணங்களுக்கு இது பயன்படுத்தப்படவில்லை."
          }
        ],
        hint: "அவரது முதல் மற்றும் இறுதிப் பயணங்கள் இரண்டுமே ஒரே பெயருடைய விண்கலத்தில் தான் நிகழ்ந்தன."
      }
    ]);

    await Content.insertMany([
      {
        lessonId: newtonsLaws._id,
        type: 'notes',
        title: 'Intro to Newton\'s First Law',
        body: '<p>An object at rest stays at rest...</p> <h1>Title</h1> <p>Some math: $$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$</p>'
      },
      {
        lessonId: newtonsLaws._id,
        type: 'video',
        title: 'First Law Explained',
        body: 'https://www.youtube.com/watch?v=5-Qp3G_545Y'
      },
      {
        lessonId: newtonsLaws._id,
        type: 'qa',
        title: 'What is inertia?',
        body: 'Inertia is the resistance of any physical object to any change in its state of motion.'
      },
      {
        lessonId: newtonsLaws._id,
        type: 'quiz',
        title: 'Science Pioneers Quiz',
        body: sampleQuizData
      },
      {
        lessonId: newtonsLaws._id,
        type: 'questionPaper',
        title: 'Physics Monthly Test - September',
        body: 'uploads/pdfs/mock_paper.pdf',
        metadata: { category: 'Monthly', subCategory: 'September' }
      },
      {
        lessonId: workEnergy._id,
        type: 'notes',
        title: 'Work-Energy Theorem',
        body: '<p>The work done on an object...</p>'
      },
      {
        lessonId: workEnergy._id,
        type: 'flashcard',
        title: 'Kinetic Energy Formula',
        body: 'KE = 1/2 * mv^2'
      },
      {
        lessonId: reflection._id,
        type: 'book',
        title: 'Chapter on Reflection',
        body: 'uploads/pdfs/reflection_chapter.pdf'
      },
      {
        lessonId: reflection._id,
        type: 'activity',
        title: 'Mirror Experiment',
        body: 'Instructions for a simple mirror experiment.'
      },
      {
        lessonId: alkanes._id,
        type: 'notes',
        title: 'Properties of Alkanes',
        body: '<p>Alkanes are saturated hydrocarbons...</p>'
      },
      {
        lessonId: alkanes._id,
        type: 'worksheet',
        title: 'Alkane Naming Practice',
        body: 'worksheet_alkanes.pdf'
      }
    ]);

    console.log('✅ Created contents');

    // Create users
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        isFirstLogin: false
      },
      {
        name: 'Teacher User',
        email: 'teacher@example.com',
        username: 'teacher',
        password: hashedPassword,
        role: 'teacher',
        status: 'active',
        isFirstLogin: true,
        mobileNumber: '+1234567890'
      },
      {
        name: 'Student User',
        email: 'student@example.com',
        username: 'student',
        password: hashedPassword,
        role: 'student',
        status: 'active',
        isFirstLogin: false
      }
    ]);

    console.log('✅ Created users');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Classes: 2 (Class 10, Class 12)');
    console.log('- Subjects: 3 (Physics, Chemistry, Mathematics)');
    console.log('- Units: 4 (Mechanics, Optics, Organic Chemistry, Calculus)');
    console.log('- Sub-units: 4 (Kinematics, Geometrical Optics, Hydrocarbons, Integration)');
    console.log('- Lessons: 6 (Newton\'s Laws, Work and Energy, etc.)');
    console.log('- Contents: 11 (various types)');
    console.log('- Users: 3 (admin, teacher, student)');
    console.log('\n🔐 Default credentials:');
    console.log('- Admin: username: admin, password: admin123');
    console.log('- Teacher: username: teacher, password: admin123');
    console.log('- Student: username: student, password: admin123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedData();