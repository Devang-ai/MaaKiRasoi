const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    restaurantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurant', 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['Breakfast', 'Lunch', 'Dinner', 'All Day'], 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    description: { 
        type: String 
    },
    items: [{ 
        type: String 
    }],
    status: { 
        type: String, 
        enum: ['active', 'inactive'], 
        default: 'active' 
    },
    activeSubscribers: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
