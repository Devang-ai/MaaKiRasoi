const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// GET all orders (Admin)
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /orders/restaurant/mine — Partner fetches their own restaurant's orders
router.get('/restaurant/mine', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = { restaurantId: req.user.id };
        if (status) query.status = status;
        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// GET single order by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add order
router.post('/', auth, async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();

        // Increment restaurant ordersCount
        await Restaurant.findByIdAndUpdate(order.restaurantId, {
            $inc: { ordersCount: 1 }
        });

        const newActivity = {
            type: 'New Order',
            description: `Order ${order.orderId} placed by ${order.customer} (₹${order.totalAmount})`,
            time: new Date()
        };
        await Activity.create(newActivity);

        // Emit real-time dashboard updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate'); // Global admin refresh
            io.emit('newActivity', newActivity);
            
            // Targeted restaurant notification
            io.to(`partner_${order.restaurantId}`).emit('new_order', {
                orderId: order._id,
                orderData: order
            });
        }

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET orders by userId
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH Update order status with real-time emission
router.patch('/:id/status', auth, checkRole(['Admin', 'Rider', 'Partner']), async (req, res) => {
    try {
        const { status } = req.body;
        const existing = await Order.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Order not found' });

        // Build update object
        const update = { status };
        const timestamps = existing.statusTimestamps || {};
        
        if (status === 'confirmed') timestamps.confirmedAt = new Date();
        if (status === 'preparing') timestamps.preparedAt = new Date();
        if (status === 'ready_for_pickup') timestamps.preparedAt = new Date();
        if (status === 'out_for_delivery') timestamps.pickedUpAt = new Date();
        if (status === 'delivered') timestamps.deliveredAt = new Date();
        
        update.statusTimestamps = timestamps;

        const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });

        const io = req.app.get('io');
        if (io) {
            // Room targets
            const targets = [String(order.userId), `partner_${order.restaurantId}`];
            if (order.riderId) targets.push(`rider_${order.riderId}`);
            targets.push('Admin');

            targets.forEach(room => {
                io.to(room).emit('orderStatusUpdate', {
                    orderId: order._id,
                    status,
                    orderData: order
                });
            });

            // Special event for partners to keep their specific lists clean
            io.to(`partner_${order.restaurantId}`).emit('partnerOrderUpdate', {
                orderId: order._id,
                status,
                restaurantId: order.restaurantId
            });

            if (status === 'cancelled') {
                io.emit('dashboardUpdate'); // Alert global admin dashboard
            }
        }

        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


// Assign Rider to order
router.patch('/:id/assign-rider', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const { riderId, riderName } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { riderId, riderName, status: 'confirmed' },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Emit real-time update to the user
        const io = req.app.get('io');
        if (io) {
            io.to(String(order.userId)).emit('orderStatusUpdate', { 
                orderId: order._id, 
                status: 'confirmed',
                riderId,
                riderName,
                orderData: order
            });

            // Notify the Rider specifically
            io.to(`rider_${riderId}`).emit('order_assigned', {
                orderId: order._id,
                orderData: order
            });
        }

        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH Cancel order (ByUser)
router.patch('/:id/user-cancel', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Security: Ensure the user cancelling is the one who placed it
        if (order.userId !== String(req.user.id)) {
            return res.status(403).json({ message: 'Unauthorized to cancel this order' });
        }

        // Restriction: Cannot cancel if already out for delivery or delivered
        const restricted = ['out_for_delivery', 'delivered', 'cancelled'];
        if (restricted.includes(order.status)) {
            return res.status(400).json({ message: `Cannot cancel an order that is ${order.status.replace(/_/g, ' ')}` });
        }

        const oldStatus = order.status;
        order.status = 'cancelled';
        await order.save();

        // Create Activity log
        const Activity = require('../models/Activity');
        await Activity.create({
            type: 'Order Cancelled',
            description: `User ${order.customer} cancelled order ${order.orderId} (Previous: ${oldStatus})`,
            time: new Date()
        });

        // Emit real-time updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', {
                type: 'Order Cancelled',
                description: `User ${order.customer} cancelled order ${order.orderId}`,
                time: new Date()
            });

            const targets = [String(order.userId), `partner_${order.restaurantId}`];
            targets.forEach(room => {
                io.to(room).emit('orderStatusUpdate', {
                    orderId: order._id,
                    status: 'cancelled',
                    orderData: order
                });
            });
        }

        res.json({ message: 'Order cancelled successfully', order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
