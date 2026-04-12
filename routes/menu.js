const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

// Helper: emit to the partner who owns this restaurant
const emitToPartner = (io, restaurantId, event, data) => {
    if (!io || !restaurantId) return;
    // Emit to partner's private room (joined via join_partner event)
    io.to(`partner_${restaurantId}`).emit(event, data);
};

// GET /menu/my-menu — Partner fetches their own restaurant's menu
router.get('/my-menu', auth, async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ restaurantId: req.user.id });
        res.json(menuItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET menu items by restaurant ID (used by UserApp + Admin Panel)
router.get('/:restaurantId', auth, async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ restaurantId: req.params.restaurantId });
        res.json(menuItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add menu item (partner adds to their own restaurant)
router.post('/', auth, async (req, res) => {
    try {
        const restaurantId = req.user.role === 'Partner' ? req.user.id : req.body.restaurantId;
        const menuItem = new MenuItem({ ...req.body, restaurantId });
        await menuItem.save();

        const io = req.app.get('io');
        // Notify the specific partner only
        emitToPartner(io, String(restaurantId), 'menuUpdate', { action: 'add', item: menuItem });
        // Also notify UserApp listeners for this restaurant
        if (io) io.to(`restaurant_${restaurantId}`).emit('menuUpdate', { action: 'add', item: menuItem });

        res.status(201).json(menuItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH toggle availability only
router.patch('/:id/availability', auth, async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });

        // Ensure partner can only toggle their own items
        if (req.user.role === 'Partner' && String(item.restaurantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden: Not your menu item' });
        }

        item.isAvailable = !item.isAvailable;
        await item.save();

        const io = req.app.get('io');
        emitToPartner(io, String(item.restaurantId), 'menuUpdate', { action: 'toggle', item });
        if (io) io.to(`restaurant_${item.restaurantId}`).emit('menuUpdate', { action: 'toggle', item });

        res.json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH update menu item (full update)
router.patch('/:id', auth, async (req, res) => {
    try {
        const existing = await MenuItem.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Menu item not found' });

        // Partner can only edit their own items
        if (req.user.role === 'Partner' && String(existing.restaurantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden: Not your menu item' });
        }

        const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });

        const io = req.app.get('io');
        emitToPartner(io, String(menuItem.restaurantId), 'menuUpdate', { action: 'update', item: menuItem });
        if (io) io.to(`restaurant_${menuItem.restaurantId}`).emit('menuUpdate', { action: 'update', item: menuItem });

        res.json(menuItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE menu item
router.delete('/:id', auth, async (req, res) => {
    try {
        const existing = await MenuItem.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Menu item not found' });

        // Partner can only delete their own items
        if (req.user.role === 'Partner' && String(existing.restaurantId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden: Not your menu item' });
        }

        await MenuItem.findByIdAndDelete(req.params.id);

        await Activity.create({
            type: 'Deletion',
            description: `Menu item ${existing.name} deleted`,
            time: new Date()
        });

        const io = req.app.get('io');
        emitToPartner(io, String(existing.restaurantId), 'menuUpdate', { action: 'delete', itemId: existing._id });
        if (io) io.to(`restaurant_${existing.restaurantId}`).emit('menuUpdate', { action: 'delete', itemId: existing._id });

        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
