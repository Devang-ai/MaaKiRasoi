const mongoose = require('mongoose');

const cuisineSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    icon: { type: String }, // Optional, for UI
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Cuisine', cuisineSchema);
