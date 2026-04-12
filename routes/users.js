const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

// GET all users
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all users with active subscription
router.get('/subscriptions', auth, async (req, res) => {
    try {
        const users = await User.find({ subscription: { $ne: null } })
            .sort({ 'subscription.startDate': -1 })
            .select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH update subscription status (Admin Control)
router.patch('/:id/subscription/status', auth, async (req, res) => {
    try {
        let user;
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(req.params.id);
        }
        if (!user) {
            user = await User.findOne({ userId: req.params.id });
        }

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.subscription) return res.status(400).json({ message: 'No active plan found' });
        
        user.subscription.status = req.body.status;
        await user.save();

        const subscriptionActivity = {
            type: 'Subscription',
            description: `Admin marked ${user.name}'s meal plan as ${req.body.status}`,
            time: new Date()
        };
        await Activity.create(subscriptionActivity);

        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', subscriptionActivity);
            io.emit('subscription_update', user);
        }
        
        res.json(user.subscription);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE subscription (Admin Control)
router.delete('/:id/subscription', auth, async (req, res) => {
    try {
        let user;
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(req.params.id);
        }
        if (!user) {
            user = await User.findOne({ userId: req.params.id });
        }

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.subscription = null;
        await user.save();

        const subscriptionActivity = {
            type: 'Subscription',
            description: `Admin deleted ${user.name}'s meal plan`,
            time: new Date()
        };
        await Activity.create(subscriptionActivity);

        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', subscriptionActivity);
            io.emit('subscription_update', user);
        }
        
        res.json({ message: 'Subscription deleted' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST add user
router.post('/', auth, async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();

        const newActivity = {
            type: 'New User',
            description: `${user.name} joined as ${user.role}`,
            time: new Date()
        };
        await Activity.create(newActivity);

        // Emit real-time dashboard updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', newActivity);
        }

        const userResponse = await User.findById(user._id).select('-password');
        res.status(201).json(userResponse);
    } catch (err) {
        console.error("Error adding user:", err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH update user
router.patch('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE user
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await Activity.create({
            type: 'Deletion',
            description: `User ${user.name} (${user.userId}) deleted`,
            time: new Date()
        });

        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single user profile with addresses and subscriptions
router.get('/:id', auth, async (req, res) => {
    try {
        let user;
        // Check if id is a valid mongoose ObjectId
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(req.params.id).select('-password');
        }
        // If not found by ObjectId or not an ObjectId, try finding by custom userId
        if (!user) {
            user = await User.findOne({ userId: req.params.id }).select('-password');
        }

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            user: user,
            addresses: user.addresses || [],
            activeSubscription: user.subscription || null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add address
router.post('/:id/address', auth, async (req, res) => {
    try {
        let user;
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(req.params.id);
        }
        if (!user) {
            user = await User.findOne({ userId: req.params.id });
        }

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const newAddress = { ...req.body, id: Date.now().toString() };
        user.addresses = user.addresses || [];
        user.addresses.push(newAddress);
        await user.save();
        
        res.status(201).json(newAddress);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST add/update subscription
router.post('/:id/subscription', auth, async (req, res) => {
    try {
        let user;
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(req.params.id);
        }
        if (!user) {
            user = await User.findOne({ userId: req.params.id });
        }

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.subscription = req.body;
        await user.save();

        const subscriptionActivity = {
            type: 'Subscription',
            description: `${user.name} ${req.body.status === 'active' ? 'activated' : 'updated'} ${req.body.plan || 'meal'} plan`,
            time: new Date()
        };
        await Activity.create(subscriptionActivity);

        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', subscriptionActivity);
            io.emit('subscription_update', user);
        }
        
        res.json(user.subscription);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});





module.exports = router;
