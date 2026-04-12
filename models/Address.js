const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    addressId: { type: String, unique: true },
    userId: { type: String, required: true }, // Link to USR-xxx
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema);
