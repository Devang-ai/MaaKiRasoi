const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    userId: { type: String, required: true },
    customer: { type: String, required: true },
    restaurantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurant', 
        required: true 
    },
    restaurant: { type: String, required: true },
    items: [{
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        price: Number,
        quantity: Number
    }],
    totalAmount: { type: Number, required: true },
    paymentMode: { type: String, default: 'COD' },
    status: { 
        type: String, 
        enum: ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'], 
        default: 'placed' 
    },
    riderId: { type: String },
    riderName: { type: String },
    restaurantLocation: {
        lat: { type: Number, default: 19.1176 },
        lng: { type: Number, default: 72.8633 }
    },
    deliveryLocation: {
        lat: { type: Number, default: 19.1032 },
        lng: { type: Number, default: 72.8465 }
    },
    statusTimestamps: {
        confirmedAt: Date,
        preparedAt: Date,
        pickedUpAt: Date,
        deliveredAt: Date
    }
}, { timestamps: true });

// Generate sequential orderId before saving
orderSchema.pre('save', async function(next) {
    if (!this.orderId) {
        const Order = mongoose.model('Order');
        const lastOrder = await Order.findOne({ orderId: { $regex: /^ORD-/ } }).sort({ orderId: -1 });
        let nextNum = 1;
        if (lastOrder && lastOrder.orderId) {
            const parts = lastOrder.orderId.split('-');
            if (parts.length === 2) {
                const lastNum = parseInt(parts[1]);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        this.orderId = `ORD-${String(nextNum).padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
