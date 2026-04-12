const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Customer', 'Restaurant Owner', 'Rider'], 
        default: 'Customer' 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Pending', 'Inactive'], 
        default: 'Active' 
    },
    addresses: [{
        id: String,
        type: { type: String, enum: ['Home', 'Work', 'Other'] },
        text: String,
        details: String,
        location: {
            lat: { type: Number },
            lng: { type: Number }
        }
    }],
    subscription: {
        plan: { type: String },
        mealsPerDay: { type: Number },
        startDate: { type: String },
        endDate: { type: String },
        restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
        status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' }
    }
}, { timestamps: true });

const bcrypt = require('bcryptjs');

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.userId) {
        const User = mongoose.model('User');
        const lastUser = await User.findOne({ userId: { $regex: /^USR-/ } }).sort({ userId: -1 });
        let nextNum = 1;
        if (lastUser && lastUser.userId) {
            const parts = lastUser.userId.split('-');
            if (parts.length === 2) {
                const lastNum = parseInt(parts[1]);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        this.userId = `USR-${String(nextNum).padStart(3, '0')}`;
    }

    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
