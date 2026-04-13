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
    imageURL: {
        type: String,
        default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
    },
    duration: {
        type: String,
        default: '30 Days'
    },
    isVeg: {
        type: Boolean,
        default: true
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
