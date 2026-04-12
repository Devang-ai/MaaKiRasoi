require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
        
        const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
        if (existingAdmin) {
            console.log('Admin already exists: admin@gmail.com');
        } else {
            const newAdmin = new Admin({
                name: 'Admin User',
                email: 'admin@gmail.com',
                password: 'admin123',
                role: 'Admin'
            });
            await newAdmin.save();
            console.log('Admin created: admin@gmail.com / admin123');
        }
        
        process.exit();
    } catch (err) {
        console.error('Failed to create admin:', err);
        process.exit(1);
    }
};

createAdmin();
