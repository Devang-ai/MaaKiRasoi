const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log(`Login attempt for: ${email}`);
        
        // Check Admin collection first
        let user = await Admin.findOne({ email });
        let role = 'Admin';

        if (!user) {
            console.log('Not found in Admin collection, checking User collection');
            // Check User collection
            user = await User.findOne({ email });
            if (user) role = user.role;
        }

        if (!user) {
            console.log('User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        console.log(`Password match for ${email}: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user._id, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                userId: user.userId || null,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: role,
                addresses: user.addresses || [],
                subscription: user.subscription || null,
            },
            admin: {
                id: user._id,
                userId: user.userId || null,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: role,
                addresses: user.addresses || [],
                subscription: user.subscription || null,
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// User Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const newUser = new User({
            name,
            email,
            phone,
            password,
            role: 'Customer'
        });

        await newUser.save();

        // Create Activity
        const Activity = require('../models/Activity');
        const newActivity = {
            type: 'New User',
            description: `${newUser.name} joined as Customer`,
            time: new Date()
        };
        await Activity.create(newActivity);

        // Emit real-time dashboard updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', newActivity);
        }

        const token = jwt.sign(
            { id: newUser._id, role: 'Customer' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                userId: newUser.userId,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: 'Customer',
                addresses: [],
                subscription: null,
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET full profile of logged-in user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH update subscription
router.patch('/update-subscription', auth, async (req, res) => {
    try {
        const { subscription } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { subscription },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Emit update to Admin dashboard in real-time
        const io = req.app.get('io');
        if (io) {
            io.emit('subscription_update', user);
        }
        
        res.json({ subscription: user.subscription });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update User Profile (Addresses, etc.)
router.patch('/update-profile', auth, async (req, res) => {
    try {
        const { addresses } = req.body;
        const user = await User.findOneAndUpdate(
            { _id: req.user.id }, // Use req.user.id from JWT payload
            { addresses },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Change Password Route
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        let user;
        if (req.user.role === 'Admin') {
            user = await Admin.findById(req.user.id);
        } else {
            user = await User.findById(req.user.id);
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
