const express = require('express');
const router = express.Router();
const PartnerChat = require('../models/PartnerChat');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// GET /partner-chat — Partner gets their own chat history (creates if new)
router.get('/', auth, async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const partner = await Restaurant.findById(req.user.id).select('-password');
        if (!partner) return res.status(404).json({ message: 'Partner not found' });

        let chat = await PartnerChat.findOne({ restaurantId: partner._id });
        if (!chat) {
            chat = new PartnerChat({
                partnerId: partner.restaurantId,
                partnerName: partner.name,
                restaurantId: partner._id,
                messages: [{
                    sender: 'Admin',
                    text: `Welcome to Maa Ki Rasoi support! 👋 We're here to help you, ${partner.name}. Type "help" anytime you need assistance.`,
                    timestamp: new Date()
                }]
            });
            await chat.save();
        }
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /partner-chat/all — Admin gets all partner chats
router.get('/all', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const chats = await PartnerChat.find({ status: 'open' })
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /partner-chat/send — Partner sends message to Admin
router.post('/send', auth, async (req, res) => {
    try {
        const { text } = req.body;
        const Restaurant = require('../models/Restaurant');
        const partner = await Restaurant.findById(req.user.id).select('-password');
        if (!partner) return res.status(404).json({ message: 'Partner not found' });

        let chat = await PartnerChat.findOne({ restaurantId: partner._id });
        if (!chat) {
            chat = new PartnerChat({
                partnerId: partner.restaurantId,
                partnerName: partner.name,
                restaurantId: partner._id,
            });
        }

        const newMessage = { sender: 'Partner', text, timestamp: new Date() };
        chat.messages.push(newMessage);
        chat.status = 'open';

        // Detect "help" keyword to flag for Admin
        if (text.toLowerCase().includes('help')) {
            chat.hasRequestedHelp = true;
        }

        await chat.save();

        const io = req.app.get('io');
        if (io) {
            // Emit to Admin dashboard
            io.emit('partner_message', {
                ...newMessage,
                partnerId: partner.restaurantId,
                partnerName: partner.name,
                restaurantId: partner._id,
                chatId: chat._id,
                hasRequestedHelp: chat.hasRequestedHelp
            });
            // Emit to partner's own socket room
            io.to(`partner_${partner.restaurantId}`).emit('partner_chat_message', newMessage);
        }

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST /partner-chat/reply/:partnerId — Admin replies to a partner
router.post('/reply/:partnerId', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const { text } = req.body;
        const { partnerId } = req.params;

        const chat = await PartnerChat.findOne({ partnerId });
        if (!chat) return res.status(404).json({ message: 'Partner chat not found' });

        const newMessage = { sender: 'Admin', text, timestamp: new Date() };
        chat.messages.push(newMessage);
        await chat.save();

        const io = req.app.get('io');
        if (io) {
            // Emit to partner's private room
            io.to(`partner_${partnerId}`).emit('partner_chat_message', newMessage);
        }

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
