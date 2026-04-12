const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const fixRestaurantTypes = async () => {
    try {
        const uri = 'mongodb://127.0.0.1:27017/maakirasoi';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB to fix restaurant types...');

        const restaurants = await Restaurant.find({});
        console.log(`Checking ${restaurants.length} restaurants...`);

        for (const res of restaurants) {
            const items = await MenuItem.find({ restaurantId: res._id });
            
            let isVeg = true;
            if (items.length > 0) {
                const hasNonVeg = items.some(item => !item.isVeg);
                isVeg = !hasNonVeg;
            }

            if (res.isVeg !== isVeg) {
                await Restaurant.findByIdAndUpdate(res._id, { isVeg });
                console.log(`FIXED: ${res.name} -> ${isVeg ? 'Veg-Only' : 'Non-Veg'}`);
            } else {
                console.log(`OK: ${res.name} is already ${isVeg ? 'Veg-Only' : 'Non-Veg'}`);
            }
        }

        console.log('Fix complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing restaurant types:', err);
        process.exit(1);
    }
};

fixRestaurantTypes();
