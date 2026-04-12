const mongoose = require('mongoose');

const partnerChatSchema = new mongoose.Schema({
    partnerId: { type: String, required: true, unique: true },
    partnerName: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    hasRequestedHelp: { type: Boolean, default: false },
    messages: [{
        sender: { type: String, enum: ['Partner', 'Admin'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('PartnerChat', partnerChatSchema);
