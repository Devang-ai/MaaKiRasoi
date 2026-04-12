const mongoose = require('mongoose');

// Direct URI to avoid .env issues
const MONGODB_URI = 'mongodb://localhost:27017/maakirasoi';

const cleanup = async () => {
    try {
        console.log('🔍 Connecting to MongoDB for Targeted User Cleanup...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected.');

        const db = mongoose.connection.db;
        const User = db.collection('users');

        // Pattern: All users with @example.com emails, excluding the main admin
        // We also check for 'User ' names just to be double-safe
        const query = {
            $or: [
                { email: { $regex: /@example\.com$/ } },
                { name: { $regex: /^User / } }
            ],
            email: { $ne: 'admin@gmail.com' } // Never delete the main admin
        };

        const countBefore = await User.countDocuments(query);
        console.log(`📊 Found ${countBefore} dummy users to delete.`);

        if (countBefore > 0) {
            const result = await User.deleteMany(query);
            console.log(`✅ Successfully deleted ${result.deletedCount} dummy users.`);
        } else {
            console.log('ℹ️ No dummy users found matching the pattern.');
        }

        console.log('🏁 USER CLEANUP COMPLETE.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed error details below:');
        console.error(err);
        process.exit(1);
    }
};

cleanup();
