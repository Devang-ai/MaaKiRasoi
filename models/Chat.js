const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['AI', 'Admin'], 
        default: 'AI' 
    },
    hasRequestedHelp: {
        type: Boolean,
        default: false
    },
    messages: [{
        sender: { type: String, enum: ['User', 'AI', 'Admin'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
