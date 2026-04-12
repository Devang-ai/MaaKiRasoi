const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

// GET all complaints
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status && status !== 'All' ? { status } : {};
        const complaints = await Complaint.find(query).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add complaint
router.post('/', auth, async (req, res) => {
    try {
        const complaint = new Complaint(req.body);
        await complaint.save();

        const newActivity = {
            type: 'Update',
            description: `New Complaint ${complaint.complaintId} from ${complaint.customer}`,
            time: new Date()
        };
        await Activity.create(newActivity);

        // Emit real-time dashboard updates
        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', newActivity);
        }

        res.status(201).json(complaint);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH update complaint (resolve)
router.patch('/:id', auth, async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        if (req.body.status === 'Resolved') {
            const newActivity = {
                type: 'Resolution',
                description: `Complaint ${complaint.complaintId} resolved: ${complaint.issue}`,
                time: new Date()
            };
            await Activity.create(newActivity);

            // Emit real-time dashboard updates
            const io = req.app.get('io');
            if (io) {
                io.emit('dashboardUpdate');
                io.emit('newActivity', newActivity);
            }
        }

        res.json(complaint);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE complaint
router.delete('/:id', auth, async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndDelete(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
        
        await Activity.create({
            type: 'Deletion',
            description: `Complaint ${complaint.complaintId || complaint._id} deleted`,
            time: new Date()
        });

        res.json({ message: 'Complaint deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
