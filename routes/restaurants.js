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

module.exports = router;
