const express = require('express');
const router = express.Router();
const Rider = require('../models/Rider');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { storage } = require('../config/cloudinary');
const multer = require('multer');

// Configure Multer for Cloudinary storage
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const cpUpload = upload.fields([
    { name: 'aadhar', maxCount: 1 },
    { name: 'license', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'rc', maxCount: 1 }
]);

// POST Rider Signup/Register
router.post('/register', cpUpload, async (req, res) => {
    try {
        console.log('>>> [BACKEND] Rider registration payload:', req.body);
        const { phone, name, email, city, vehicleType, vehicleNumber } = req.body;
        
        // Check if phone already registered
        let existing = await Rider.findOne({ phone });
        if (existing) return res.status(400).json({ message: 'Rider with this phone already exists' });

        const getFileUrl = (fieldName) => {
            if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
                // For Cloudinary, multer-storage-cloudinary puts the URL in .path
                return req.files[fieldName][0].path; 
            }
            return null;
        };

        const rider = new Rider({
            phone, 
            name, 
            email, 
            city, 
            vehicle_type: vehicleType, 
            vehicle_number: vehicleNumber,
            aadhar_url: getFileUrl('aadhar'),
            license_url: getFileUrl('license'),
            pan_url: getFileUrl('pan'),
            rc_url: getFileUrl('rc'),
            account_number: req.body['bankDetails[accountNumber]'],
            ifsc: req.body['bankDetails[ifsc]'],
            bank_name: req.body['bankDetails[bankName]'],
            status: 'Pending'
        });
        
        await rider.save();

        const token = jwt.sign({ id: rider._id, role: 'Rider' }, process.env.JWT_SECRET || 'secret');
        res.status(201).json({ 
            message: 'Rider application submitted successfully',
            token, 
            rider 
        });
    } catch (err) {
        console.error('❌ [BACKEND] Registration Crash:', err);
        res.status(500).json({ 
            message: 'Registration failed on server', 
            error: err.message
        });
    }
});

// POST Rider Login (OTP-less for now, simple check)
router.post('/login', async (req, res) => {
    try {
        const { phone } = req.body;
        const rider = await Rider.findOne({ phone });
        
        if (!rider) return res.status(404).json({ message: 'Rider not found. Please register.' });

        const token = jwt.sign({ id: rider._id, role: 'Rider' }, process.env.JWT_SECRET || 'secret');
        res.json({ token, rider });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET /api/riders/earnings - Get real performance stats for the logged-in rider
router.get('/earnings', auth, async (req, res) => {
    try {
        const Order = require('../models/Order');
        const riderId = req.user.id;

        // Current date range for 'Today'
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Previous 7 days for 'Weekly'
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Calculate Today's Earnings
        const todayOrders = await Order.find({
            riderId: riderId,
            status: 'delivered',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        const todayEarnings = todayOrders.reduce((sum, order) => sum + (order.riderEarnings || 40), 0);

        // 2. Calculate Weekly Earnings
        const weeklyOrders = await Order.find({
            riderId: riderId,
            status: 'delivered',
            createdAt: { $gte: sevenDaysAgo }
        });
        const weeklyEarnings = weeklyOrders.reduce((sum, order) => sum + (order.riderEarnings || 40), 0);

        // 3. Transactions History
        const history = weeklyOrders.map(order => ({
            id: order._id,
            title: `Deliver to ${order.customer}`,
            amount: order.riderEarnings || 40,
            type: 'delivery',
            timestamp: order.createdAt
        }));

        res.json({
            today: todayEarnings,
            weekly: weeklyEarnings,
            total: weeklyEarnings, // Simplified for now
            balance: todayEarnings, // Simplified available balance
            history: history.sort((a, b) => b.timestamp - a.timestamp)
        });
    } catch (err) {
        console.error('Earnings Fetch Error:', err);
        res.status(500).json({ message: 'Failed to fetch earnings' });
    }
});

// GET all riders
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const riders = await Rider.find(query).sort({ createdAt: -1 });
        res.json(riders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add rider
router.post('/', auth, async (req, res) => {
    try {
        const rider = new Rider(req.body);
        await rider.save();

        const newActivity = {
            type: 'Update',
            description: `New Rider ${rider.name} added`,
            time: new Date()
        };
        await Activity.create(newActivity);

        // Emit real-time dashboard updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', newActivity);
        }

        res.status(201).json(rider);
    } catch (err) {
        console.error("Error adding rider:", err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH update rider status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`>>> [BACKEND] Updating Status for Rider ID: ${req.params.id} to: ${status}`);
        
        const rider = await Rider.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        
        if (!rider) {
            console.log(`>>> [BACKEND] Update Failed: Rider not found with ID ${req.params.id}`);
            return res.status(404).json({ message: 'Rider not found' });
        }
        
        console.log(`>>> [BACKEND] Update Success for ${rider.name}`);
        res.json(rider);
    } catch (err) {
        console.error(`>>> [BACKEND] Update ERROR:`, err.message);
        res.status(400).json({ message: err.message });
    }
});

// PATCH update rider (generic)
router.patch('/:id', auth, async (req, res) => {
    try {
        const rider = await Rider.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!rider) return res.status(404).json({ message: 'Rider not found' });
        res.json(rider);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE rider
router.delete('/:id', auth, async (req, res) => {
    try {
        const rider = await Rider.findByIdAndDelete(req.params.id);
        if (!rider) return res.status(404).json({ message: 'Rider not found' });

        await Activity.create({
            type: 'Deletion',
            description: `Rider ${rider.name} (${rider.riderId}) deleted`,
            time: new Date()
        });

        res.json({ message: 'Rider deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
