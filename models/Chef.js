const mongoose = require('mongoose');

const chefSchema = new mongoose.Schema({
    chefId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    specialty: { type: String, required: true }, // e.g., North Indian, Bakery
    experience: { type: Number, default: 0 }, // Years
    status: { 
        type: String, 
        enum: ['Active', 'On Leave', 'Inactive'], 
        default: 'Active' 
    },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' } // Optional link
}, { timestamps: true });

module.exports = mongoose.model('Chef', chefSchema);
