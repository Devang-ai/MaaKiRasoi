const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurant', 
        required: true 
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    isVeg: { type: Boolean, default: false },
    image: { type: String },
    imageURL: { type: String },
    description: { type: String },
    isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Helper function to update Restaurant's isVeg status
const updateRestaurantVegStatus = async (restaurantId) => {
    try {
        const Restaurant = mongoose.model('Restaurant');
        const items = await MenuItem.find({ restaurantId });
        
        // If no items, default to Veg (or leave as is? Let's go with Veg)
        if (items.length === 0) {
            await Restaurant.findByIdAndUpdate(restaurantId, { isVeg: true });
            return;
        }

        // If any item is Non-Veg, the restaurant is Non-Veg
        const hasNonVeg = items.some(item => !item.isVeg);
        await Restaurant.findByIdAndUpdate(restaurantId, { isVeg: !hasNonVeg });
        
        console.log(`Updated Restaurant ${restaurantId} isVeg to: ${!hasNonVeg}`);
    } catch (err) {
        console.error('Error updating restaurant isVeg status:', err);
    }
};

// Hooks
menuItemSchema.post('save', async function() {
    await updateRestaurantVegStatus(this.restaurantId);
});

menuItemSchema.post('remove', async function() {
    await updateRestaurantVegStatus(this.restaurantId);
});

menuItemSchema.post('findOneAndDelete', async function(doc) {
    if (doc) await updateRestaurantVegStatus(doc.restaurantId);
});

module.exports = MenuItem;
