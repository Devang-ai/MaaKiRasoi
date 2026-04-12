const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Rider = require('../models/Rider');
const Chef = require('../models/Chef');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
    try {
        const [
            userCount,
            restaurantCount,
            orderCount,
            riderCount,
            chefCount,
            revenueData,
            activeOrdersCount,
            activeSubscriptionsCount,
            deliveredCount,
            cancelledCount,
            adminRecord
        ] = await Promise.all([
            User.countDocuments(),
            Restaurant.countDocuments(),
            Order.countDocuments(),
            Rider.countDocuments(),
            Chef.countDocuments(),
            Payment.aggregate([
                { $match: { status: 'Success' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Order.countDocuments({ status: { $in: ['placed', 'confirmed', 'preparing', 'out_for_delivery'] } }),
            User.countDocuments({ 'subscription.status': 'active' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' }),
            Admin.findOne().sort({ createdAt: 1 }).select('createdAt')
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        res.json({
            users: userCount,
            restaurants: restaurantCount,
            orders: orderCount,
            riders: riderCount,
            chefs: chefCount,
            revenue: totalRevenue,
            activeOrders: activeOrdersCount,
            activeSubscriptions: activeSubscriptionsCount,
            deliveredOrders: deliveredCount,
            cancelledOrders: cancelledCount,
            dbCreatedAt: adminRecord ? adminRecord.createdAt : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/dashboard/activity
router.get('/activity', auth, async (req, res) => {
    try {
        const Activity = require('../models/Activity');
        const activities = await Activity.find()
            .sort({ time: -1 })
            .limit(15);
        
        res.json(activities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/dashboard/analytics (Charts)
router.get('/analytics', auth, async (req, res) => {
    try {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        // 1. Daily Orders (Last 7 Days)
        const dailyOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Daily Revenue (Last 7 Days)
        const dailyRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'Success',
                    createdAt: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Daily Users (Last 7 Days)
        const dailyUsers = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Top Restaurants (Limit to top 5)
        const topRestaurants = await Restaurant.find().sort({ ordersCount: -1 }).limit(5).select('name ordersCount city');

        // 5. Top Riders
        const topRiders = await Rider.find().sort({ rating: -1 }).limit(5).select('name rating status');

        res.json({
            dailyOrders,
            dailyRevenue,
            dailyUsers,
            topRestaurants,
            topRiders
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
