const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const restaurantSchema = new mongoose.Schema({
    restaurantId: { type: String, unique: true },
    name: { type: String, required: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    ownerMobile: { type: String },
    contactNumber: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    pincode: { type: String },
    address: { type: String, required: true },
    landmark: { type: String },
    description: { type: String },
    imageURL: { type: String },
    documents: {
        restaurantLicenseURL: { type: String },
        fssaiCertificateURL: { type: String },
        gstCertificateURL: { type: String }
    },
    bankDetails: {
        panNumber: { type: String },
        accountHolderName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        cancelledChequeURL: { type: String }
    },
    cuisine: { type: mongoose.Schema.Types.ObjectId, ref: 'Cuisine' },
    isVeg: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['pending', 'active', 'suspended'], 
        default: 'pending' 
    },
    isPaused: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    isOnboardingCompleted: { type: Boolean, default: false }
}, { timestamps: true });

restaurantSchema.pre('save', async function(next) {
    try {
        if (!this.restaurantId) {
            const Restaurant = mongoose.model('Restaurant');
            const lastRestaurant = await Restaurant.findOne({ restaurantId: { $regex: /^RES-/ } }).sort({ restaurantId: -1 });
            let nextNum = 1;
            if (lastRestaurant && lastRestaurant.restaurantId) {
                const parts = lastRestaurant.restaurantId.split('-');
                if (parts.length === 2) {
                    const lastNum = parseInt(parts[1]);
                    if (!isNaN(lastNum)) nextNum = lastNum + 1;
                }
            }
            this.restaurantId = `RES-${String(nextNum).padStart(3, '0')}`;
            console.log('Generated Restaurant ID:', this.restaurantId);
        }
        if (this.isModified('password')) {
            this.password = await bcrypt.hash(this.password, 10);
        }
        next();
    } catch (err) {
        console.error('PRE-SAVE ERROR in Restaurant:', err);
        next(err);
    }
});

restaurantSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Restaurant', restaurantSchema);
