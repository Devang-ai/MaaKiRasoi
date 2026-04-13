const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../models/SubscriptionPlan');
const auth = require('../middleware/auth');

// Helper to emit updates
const emitUpdate = (io, restaurantId, event, data) => {
    if (!io || !restaurantId) return;
    io.to(`partner_${restaurantId}`).emit(event, data);
    io.to(`restaurant_${restaurantId}`).emit(event, data);
};

// GET all ACTIVE subscription plans across all restaurants (UserApp - Public)
router.get('/all', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ status: 'active' }).populate('restaurantId', 'name imageURL city');
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all subscription plans (Admin Panel)
router.get('/', auth, async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find().populate('restaurantId', 'name imageURL city');
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET my restaurant's plans (PartnerApp)
router.get('/my-plans', auth, async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ restaurantId: req.user.id });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET my restaurant's active subscribers (PartnerApp)
router.get('/my-subscribers', auth, async (req, res) => {
    try {
        const User = require('../models/User');
        const subscribers = await User.find({ 
            'subscription.restaurantId': req.user.id,
            'subscription.status': 'active'
        }).select('name email phone subscription userId');
        
        // Format for frontend
        const formatted = subscribers.map(s => ({
            id: s._id,
            userId: s.userId,
            userName: s.name,
            email: s.email,
            phone: s.phone,
            planName: s.subscription.plan,
            startDate: s.subscription.startDate,
            endDate: s.subscription.endDate,
            deliveryStatus: 'pending', // Default status for today
            planId: s.subscription.planId || '' // Ensure we have planId if stored
        }));
        
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET plans for a specific restaurant (UserApp - Public)
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        console.log(`--- Fetching Plans for Restaurant: ${req.params.restaurantId} ---`);
        const plans = await SubscriptionPlan.find({ 
            restaurantId: req.params.restaurantId,
            status: 'active'
        });
        console.log(`Found ${plans.length} plans`);
        res.json(plans);
    } catch (err) {
        console.error('Fetch Plans ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST create a new meal plan
router.post('/', auth, async (req, res) => {
    try {
        console.log('--- Create Plan Attempt ---');
        console.log('User:', req.user);
        console.log('Body:', req.body);

        const restaurantId = req.user.role === 'Partner' ? req.user.id : req.body.restaurantId;
        console.log('Resolved RestaurantID:', restaurantId);

        if (!restaurantId) {
            console.log('Create Plan Fail: Missing RestaurantID');
            return res.status(400).json({ message: 'Restaurant ID is required' });
        }

        const plan = new SubscriptionPlan({ 
            ...req.body, 
            restaurantId: restaurantId 
        });
        await plan.save();
        console.log('Plan saved:', plan._id);

        const io = req.app.get('io');
        emitUpdate(io, String(restaurantId), 'subscriptionUpdate', { action: 'add', plan });

        res.status(201).json(plan);
    } catch (err) {
        console.error('Create Plan ERROR:', err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH update a plan
router.patch('/:id', auth, async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        if (req.user.role === 'Partner' && String(plan.restaurantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden: Not your plan' });
        }

        Object.assign(plan, req.body);
        await plan.save();

        const io = req.app.get('io');
        emitUpdate(io, String(plan.restaurantId), 'subscriptionUpdate', { action: 'update', plan });

        res.json(plan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a plan
router.delete('/:id', auth, async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        if (req.user.role === 'Partner' && String(plan.restaurantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden: Not your plan' });
        }

        await SubscriptionPlan.findByIdAndDelete(req.params.id);

        const io = req.app.get('io');
        emitUpdate(io, String(plan.restaurantId), 'subscriptionUpdate', { action: 'delete', planId: plan._id });

        res.json({ message: 'Plan deleted successfuly' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
