const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
let token = ''; // You might need to login first or mock auth

// Mock auth bypass or login function if needed
// For now, let's assume we can hit it if we had a token, 
// OR we can just check the database directly to see if aggregation works 
// via a script similar to check_data.js but for the dashboard logic.

// Actually, better to test the functionality by running the queries directly
// akin to a unit test since we might not have the server running accessible via localhost in this environment easily.

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Rider = require('../models/Rider');
const Chef = require('../models/Chef');

const testDashboardLogic = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB for verification...');

        console.log('--- DASHBOARD STATS ---');
        const userCount = await User.countDocuments();
        const restCount = await Restaurant.countDocuments();
        const orderCount = await Order.countDocuments();
        const riderCount = await Rider.countDocuments();
        const chefCount = await Chef.countDocuments();
        
        const revenue = await Payment.aggregate([
            { $match: { status: 'Success' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        console.log(`Users: ${userCount}`);
        console.log(`Restaurants: ${restCount}`);
        console.log(`Orders: ${orderCount}`);
        console.log(`Riders: ${riderCount}`);
        console.log(`Chefs: ${chefCount}`);
        console.log(`Revenue: ${revenue[0]?.total || 0}`);

        console.log('\n--- ANALYTICS DATA (First 3 Days of Revenue) ---');
        const dailyRevenue = await Payment.aggregate([
            { $match: { status: 'Success' } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" } } },
            { $sort: { _id: 1 } },
            { $limit: 3 }
        ]);
        console.log(JSON.stringify(dailyRevenue, null, 2));

        console.log('\nVerification Completed!');
        process.exit();
    } catch (err) {
        console.error('Verification Failed:', err);
        process.exit(1);
    }
};

testDashboardLogic();
