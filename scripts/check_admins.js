require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');

const checkAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
        
        const admins = await Admin.find().select('email name role');
        console.log('Admins in Admin collection:', JSON.stringify(admins, null, 2));
        
        const adminUsers = await User.find({ role: 'Admin' }).select('email name role');
        console.log('Admins in User collection:', JSON.stringify(adminUsers, null, 2));
        
        process.exit();
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
};

checkAdmins();
