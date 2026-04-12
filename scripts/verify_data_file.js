const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Rider = require('../models/Rider');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const resCount = await Restaurant.countDocuments();
        const menuCount = await MenuItem.countDocuments();
        const riderCount = await Rider.countDocuments();
        const userCount = await User.countDocuments({ role: 'Customer' });

        const output = `Restaurants: ${resCount}\nMenu Items: ${menuCount}\nRiders: ${riderCount}\nCustomers: ${userCount}\n`;
        fs.writeFileSync(path.join(__dirname, '../verification_results.txt'), output);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync(path.join(__dirname, '../verification_results.txt'), 'Error: ' + err.message);
        process.exit(1);
    }
};

verify();
