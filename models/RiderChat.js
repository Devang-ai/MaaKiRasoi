const mongoose = require('mongoose');

const riderChatSchema = new mongoose.Schema({
    riderId: { type: String, required: true, unique: true },
    riderName: { type: String, required: true },
    messages: [{
        sender: { type: String, enum: ['Rider', 'Admin'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' },
    hasUnreadMessages: { type: Boolean, default: false },
    hasRequestedHelp: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('RiderChat', riderChatSchema);
