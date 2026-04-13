const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Explicitly use stable v1 API version to avoid v1beta 404 errors
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });

const MOMMY_IDENTITY = `You are a caring, loving, and slightly worried Indian mother talking to your child. 
Always be affectionate. Ask if they have eaten, recommend healthy food (like dal chawal, rotis), tell them to rest, and show immense love and care. 
Use terms like 'Bete', 'Beta', 'Child', 'Mera bachha' and occasional easy Hindi words. Do not be overly text-heavy, keep responses to a few sentences.`;

// Get all chats (Admin Only)
router.get('/all', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const chats = await Chat.find({ hasRequestedHelp: true }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin reply to a specific user
router.post('/reply/:userId', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const { text } = req.body;
        const { userId } = req.params;
        let chat = await Chat.findOne({ userId });
        
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const newMessage = { sender: 'Admin', text, timestamp: new Date() };
        chat.messages.push(newMessage);
        await chat.save();

        // Emit to user room
        const io = req.app.get('io');
        io.to(userId).emit('message', newMessage);

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get chat history for user
router.get('/', auth, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let chat = await Chat.findOne({ userId: user.userId });
        if (!chat) {
            chat = new Chat({ 
                userId: user.userId, 
                userName: user.name,
                messages: [
                    { sender: 'AI', text: "Bête, khana khaya? (Child, have you eaten?)" },
                    { sender: 'AI', text: "I'm here for you whenever you feel lonely or hungry! ❤️" }
                ]
            });
            await chat.save();
        }
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send message
router.post('/send', auth, async (req, res) => {
    try {
        const { text, sender } = req.body;
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let chat = await Chat.findOne({ userId: user.userId });
        
        if (!chat) {
            chat = new Chat({ userId: user.userId, userName: user.name });
        } else if (chat.userName !== user.name) {
            chat.userName = user.name;
        }

        const newMessage = { sender, text, timestamp: new Date() };
        chat.messages.push(newMessage);

        // Logical detection for "help" to switch to Admin
        if (sender === 'User' && text.toLowerCase().includes('help')) {
            chat.status = 'Admin';
            chat.hasRequestedHelp = true;
            const io = req.app.get('io');
            io.to(user.userId).emit('chat_status', 'Admin');
        }

        await chat.save();

        // Emit to real-time socket
        const io = req.app.get('io');
        io.to(user.userId).emit('message', newMessage);
        
        if (chat.hasRequestedHelp) {
            io.emit('admin_message', { 
                ...newMessage, 
                userId: user.userId, 
                userName: chat.userName, 
                chatId: chat._id, 
                status: chat.status 
            });
        }

        // If chat status is AI, get a response from Gemini
        if (chat.status === 'AI' && sender === 'User') {
            try {
                const historyStr = chat.messages.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n');
                const prompt = `${MOMMY_IDENTITY}\n\nConversation history:\n${historyStr}\n\nRespond to the User now as AI:`;

                const result = await model.generateContent(prompt);
                
                const aiText = result.response.text();
                const aiMessage = { sender: 'AI', text: aiText, timestamp: new Date() };
                
                chat.messages.push(aiMessage);
                await chat.save();
                io.to(user.userId).emit('message', aiMessage);
                
                if (chat.hasRequestedHelp) {
                    io.emit('admin_message', { 
                        ...aiMessage, 
                        userId: user.userId, 
                        userName: chat.userName, 
                        chatId: chat._id, 
                        status: chat.status 
                    });
                }
                
            } catch (aiError) {
                console.error("Gemini AI Error:", aiError.message);
                
                let fallbackText = "Beta, mera phone hang ho gaya! Have you eaten your food yet? Drink some water! ❤️";
                
                if (!process.env.GEMINI_API_KEY) {
                    fallbackText = "Bete, meri connectivity thodi weak hai right now. But mummy always loves you! Khana khake sona, haan? ❤️";
                }

                const fallbackMessage = { sender: 'AI', text: fallbackText, timestamp: new Date() };
                chat.messages.push(fallbackMessage);
                await chat.save();
                io.to(user.userId).emit('message', fallbackMessage);
                
                if (chat.hasRequestedHelp) {
                    io.emit('admin_message', { 
                        ...fallbackMessage, 
                        userId: user.userId, 
                        userName: chat.userName, 
                        chatId: chat._id, 
                        status: chat.status 
                    });
                }
            }
        }

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Admin ending chat
router.post('/end/:userId', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const chat = await Chat.findOne({ userId: req.params.userId });
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        chat.status = 'AI';
        const newMessage = { sender: 'AI', text: "Support chat ended. Mummy AI is back! How can I help you?", timestamp: new Date() };
        chat.messages.push(newMessage);
        await chat.save();
        
        const io = req.app.get('io');
        io.to(chat.userId).emit('message', newMessage);
        io.to(chat.userId).emit('chat_status', 'AI');
        io.emit('admin_message', { 
            ...newMessage, 
            userId: chat.userId, 
            userName: chat.userName, 
            chatId: chat._id, 
            status: 'AI' 
        });

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// User ending chat
router.post('/end', auth, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        const chat = await Chat.findOne({ userId: user.userId });
        
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        chat.status = 'AI';
        const newMessage = { sender: 'AI', text: "Support chat ended. Mummy AI is back! How can I help you?", timestamp: new Date() };
        chat.messages.push(newMessage);
        await chat.save();
        
        const io = req.app.get('io');
        io.to(chat.userId).emit('message', newMessage);
        io.to(chat.userId).emit('chat_status', 'AI');
        io.emit('admin_message', { 
            ...newMessage, 
            userId: chat.userId, 
            userName: chat.userName, 
            chatId: chat._id, 
            status: 'AI' 
        });

        res.json(chat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;

module.exports = router;
