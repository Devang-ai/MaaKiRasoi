const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: { type: String, unique: true }, // PAY-xxx
    orderId: { type: String, required: true }, // Link to Order ID string (ORD-xxx)
    userId: { type: String, required: true }, // USR-xxx
    amount: { type: Number, required: true },
    method: { 
        type: String, 
        enum: ['Card', 'UPI', 'Wallet', 'COD', 'NetBanking'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Success', 'Pending', 'Failed', 'Refunded'], 
        default: 'Pending' 
    },
    transactionDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
