const express = require('express');
const router = express.Router();
const RiderChat = require('../models/RiderChat');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// Get all rider chats (Admin Only)
router.get('/all', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const chats = await RiderChat.find().sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin reply to a specific rider
router.post('/reply/:riderId', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const { text } = req.body;
        const { riderId } = req.params;
        let chat = await RiderChat.findOne({ riderId });
        
        if (!chat) return res.status(404).json({ message: 'Rider chat not found' });

        const newMessage = { sender: 'Admin', text, timestamp: new Date() };
        chat.messages.push(newMessage);
        chat.hasUnreadMessages = true;
        await chat.save();

        // Emit to rider room
        const io = req.app.get('io');
        if (io) {
            io.to(`rider_${riderId}`).emit('rider_message', newMessage);
        }

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get chat history for rider
router.get('/:riderId', auth, async (req, res) => {
    try {
        const { riderId } = req.params;
        let chat = await RiderChat.findOne({ riderId });
        
        if (!chat) {
            // Check if rider exists first (optional refinement)
            chat = new RiderChat({ 
                riderId, 
                riderName: req.body.riderName || 'Rider', 
                messages: [
                    { sender: 'Admin', text: "Welcome to Rider Support! How can we help you today?" }
                ]
            });
            await chat.save();
        }
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Rider sends message to Admin
router.post('/send', auth, async (req, res) => {
    try {
        const { text, riderId, riderName } = req.body;
        
        let chat = await RiderChat.findOne({ riderId });
        
        if (!chat) {
            chat = new RiderChat({ riderId, riderName });
        }

        const newMessage = { sender: 'Rider', text, timestamp: new Date() };
        chat.messages.push(newMessage);

        // Detect "help" keyword to flag for Admin
        if (text.toLowerCase().includes('help')) {
            chat.hasRequestedHelp = true;
            chat.status = 'Active';
        }

        await chat.save();

        // Emit to admin-only room
        const io = req.app.get('io');
        if (io) {
            io.to('Admin').emit('admin_rider_message', { 
                ...newMessage, 
                riderId, 
                riderName: chat.riderName, 
                chatId: chat._id,
                hasRequestedHelp: chat.hasRequestedHelp
            });
        }

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
