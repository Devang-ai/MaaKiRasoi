const mongoose = require('mongoose');

// Direct URI to avoid .env issues
const MONGODB_URI = 'mongodb://localhost:27017/maakirasoi';

const cleanupGlobal = async () => {
    try {
        console.log('🔍 Connecting to MongoDB for EXHAUSTIVE Global Cleanup...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected.');

        const db = mongoose.connection.db;
        
        // ALL Collections to target (Exhaustive Purge)
        const collections = [
            'users', 
            'restaurants', 
            'riders', 
            'complaints', 
            'menuitems', 
            'orders', 
            'payments', 
            'chats',
            'partnerchats',
            'riderchats',
            'orderchats'
        ];

        for (const colName of collections) {
            const collection = db.collection(colName);
            
            let query = {};
            
            // Protect Admin Account
            if (colName === 'users') {
                query = { email: { $ne: 'admin@gmail.com' } };
            }

            const result = await collection.deleteMany(query);
            console.log(`✅ ${colName.toUpperCase()}: Deleted ${result.deletedCount} records.`);
        }

        console.log('\n🏁 EXHAUSTIVE CLEANUP COMPLETE.');
        console.log('🚀 Chat list and Dashboard are now fully Real-Time (Zero-State).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:');
        console.error(err);
        process.exit(1);
    }
};

cleanupGlobal();
