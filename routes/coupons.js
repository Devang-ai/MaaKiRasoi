const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// GET all active coupons
router.get('/', auth, async (req, res) => {
    try {
        const coupons = await Coupon.find({ isActive: true, validUntil: { $gte: new Date() } });
        
        // Filter based on isNewUserOnly
        const userOrdersCount = await Order.countDocuments({ userId: req.user.id });
        const filteredCoupons = coupons.filter(coupon => {
            if (coupon.isNewUserOnly && userOrdersCount > 0) {
                return false;
            }
            return true;
        });
        
        res.json(filteredCoupons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add coupon (Admin only)
router.post('/', auth, checkRole(['admin']), async (req, res) => {
    try {
        const coupon = new Coupon(req.body);
        await coupon.save();
        res.status(201).json(coupon);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
