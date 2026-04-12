const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    type: { 
        type: String, 
        required: true,
        enum: ['New User', 'New Restaurant', 'New Order', 'Restaurant Update', 'Menu Update', 'Order Update', 'Deletion', 'Resolution', 'Update', 'Subscription']
    },
    description: { type: String, required: true },
    time: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed } // Optional extra info
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
