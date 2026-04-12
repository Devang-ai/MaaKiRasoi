const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
    riderId: { type: String, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    city: { type: String },
    vehicle: { 
        type: String, 
        enum: ['Bike', 'Scooter', 'Bicycle', 'Other'],
        required: false 
    },
    vehicle_type: { type: String },
    vehicle_number: { type: String },
    status: { 
        type: String, 
        enum: ['Available', 'On Delivery', 'Offline', 'Pending', 'Active', 'Suspended'], 
        default: 'Pending' 
    },
    aadhar_url: { type: String },
    license_url: { type: String },
    pan_url: { type: String },
    rc_url: { type: String },
    account_number: { type: String },
    ifsc: { type: String },
    bank_name: { type: String },
    rating: { type: Number, default: 0 },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    lastUpdated: { type: Date },
}, { timestamps: true });

riderSchema.pre('save', async function(next) {
    if (!this.riderId) {
        const Rider = mongoose.model('Rider');
        const lastRider = await Rider.findOne({ riderId: { $regex: /^RID-/ } }).sort({ riderId: -1 });
        let nextNum = 1;
        if (lastRider && lastRider.riderId) {
            const parts = lastRider.riderId.split('-');
            if (parts.length === 2) {
                const lastNum = parseInt(parts[1]);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        this.riderId = `RID-${String(nextNum).padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Rider', riderSchema);
