const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // e.g., WELCOME50
    discountType: { type: String, enum: ['Percentage', 'Flat'], default: 'Percentage' },
    discountValue: { type: Number, required: true }, // 50 or 100
    minOrderValue: { type: Number, default: 0 },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    isNewUserOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
