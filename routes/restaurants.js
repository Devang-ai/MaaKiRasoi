const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

// GET all restaurants
router.get('/', auth, async (req, res) => {
    try {
        const { status, cuisine } = req.query;
        const query = {};
        if (status) query.status = status;
        if (cuisine) query.cuisine = cuisine;

        const restaurants = await Restaurant.find(query)
            .populate('cuisine', 'name image icon')
            .sort({ createdAt: -1 });
        res.json(restaurants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add restaurant
router.post('/', auth, async (req, res) => {
    try {
        const restaurant = new Restaurant(req.body);
        await restaurant.save();

        const newActivity = {
            type: 'Restaurant Update',
            description: `New Restaurant ${restaurant.name} added`,
            time: new Date()
        };
        await Activity.create(newActivity);

        // Emit real-time dashboard updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', newActivity);
        }

        res.status(201).json(restaurant);
    } catch (err) {
        console.error("Error adding restaurant:", err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH update status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const restaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH update restaurant (generic)
router.patch('/:id', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE restaurant
router.delete('/:id', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        await Activity.create({
            type: 'Deletion',
            description: `Restaurant ${restaurant.name} (${restaurant.restaurantId}) deleted`,
            time: new Date()
        });

        res.json({ message: 'Restaurant deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET my dashboard stats for partner app
router.get('/my-hq-stats', auth, async (req, res) => {
    try {
        const Order = require('../models/Order');
        const MenuItem = require('../models/MenuItem');
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const Restaurant = require('../models/Restaurant');
        const restaurantId = req.user.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            todayOrders,
            activeOrdersCount,
            menuItems,
            restaurant,
            activePlans
        ] = await Promise.all([
            Order.find({ 
                restaurant: restaurantId, 
                createdAt: { $gte: today },
                status: { $in: ['delivered', 'Completed'] }
            }),
            Order.countDocuments({ 
                restaurant: restaurantId, 
                status: { $in: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'ready_for_pickup'] } 
            }),
            MenuItem.find({ restaurant: restaurantId }),
            Restaurant.findById(restaurantId).select('rating'),
            SubscriptionPlan.find({ restaurantId: restaurantId })
        ]);

        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
        const avgPrepTime = menuItems.length > 0 
            ? Math.round(menuItems.reduce((sum, item) => sum + (parseInt(item.prepTime) || 0), 0) / menuItems.length)
            : 0;
        
        const activeSubs = activePlans.reduce((sum, p) => sum + (p.activeSubscribers || 0), 0);
        const subRevenue = activePlans.reduce((sum, p) => sum + ((p.activeSubscribers || 0) * (p.price || 0)), 0);

        res.json({
            todayRevenue,
            activeOrders: activeOrdersCount,
            avgPrepTime,
            rating: restaurant?.rating || 0,
            activeSubscriptions: activeSubs,
            subscriptionRevenue: subRevenue
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
