require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const debugLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
        
        console.log('\n--- Checking Admin Collection ---');
        const admins = await Admin.find();
        if (admins.length === 0) {
            console.log('No users in Admin collection.');
        } else {
            for (const a of admins) {
                const isMatch = await bcrypt.compare('admin123', a.password);
                console.log(`Email: ${a.email}, Name: ${a.name}, Role: ${a.role}, Password Match (admin123): ${isMatch}`);
            }
        }
        
        console.log('\n--- Checking User Collection (Role: Admin) ---');
        const adminUsers = await User.find({ role: 'Admin' });
        if (adminUsers.length === 0) {
            console.log('No users with role "Admin" in User collection.');
        } else {
            for (const u of adminUsers) {
                console.log(`Email: ${u.email}, Name: ${u.name}, Role: ${u.role}`);
            }
        }

        console.log('\n--- Checking User Collection (All Users) ---');
        const allUsers = await User.find().limit(5);
        for (const u of allUsers) {
            console.log(`Email: ${u.email}, Role: ${u.role}`);
        }
        
        process.exit();
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
};

debugLogin();
