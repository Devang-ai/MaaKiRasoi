require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB.');
        
        const count = await User.countDocuments();
        console.log(`User count: ${count}`);
        
        if (count > 0) {
            const riders = await require('../models/Rider').find().select('riderId name');
            const complaints = await require('../models/Complaint').find().select('complaintId issue');
            console.log('Sample Riders:', JSON.stringify(riders.slice(0, 3), null, 2));
            console.log('Sample Complaints:', JSON.stringify(complaints.slice(0, 3), null, 2));
        } else {
            console.log('No users found in the database.');
        }
        
        process.exit();
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
};

checkData();
