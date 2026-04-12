require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');

const run = async () => {
    try {
        const uri = 'mongodb://127.0.0.1:27017/maakirasoi';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected.');

        await Admin.deleteMany({ email: 'admin@gmail.com' });
        const admin = new Admin({
            name: 'Admin',
            email: 'admin@gmail.com',
            password: 'admin123',
            role: 'Admin'
        });
        await admin.save();
        console.log('Admin created successfully.');

        // Also check if user@example.com exists
        const user = await User.findOne({ email: 'user@example.com' });
        console.log('Demo User exists:', !!user);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

run();
