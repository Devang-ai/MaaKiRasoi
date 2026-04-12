const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Direct URI to avoid .env issues during script execution
const MONGODB_URI = 'mongodb://localhost:27017/maakirasoi';

const reset = async () => {
    try {
        console.log('🔄 Connecting to MongoDB for Factory Reset (Local)...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected.');

        const db = mongoose.connection.db;
        const collections = await db.collections();
        
        console.log(`🔍 Found ${collections.length} collections.`);

        for (let collection of collections) {
            const name = collection.collectionName;
            console.log(`🧹 Wiping collection: ${name}...`);
            await collection.deleteMany({});
        }

        console.log('✨ All collections purged successfully.');

        // Cleanup partner_docs
        // Path is relative to this script in /backend/scripts/
        const docsPath = path.resolve(__dirname, '../partner_docs');
        console.log(`📂 Checking partner_docs at: ${docsPath}`);
        
        if (fs.existsSync(docsPath)) {
            const files = fs.readdirSync(docsPath);
            console.log(`🗑️ Deleting ${files.length} files...`);
            for (const file of files) {
                // Keep .gitkeep if it exists, otherwise delete
                if (file !== '.gitkeep') {
                    fs.unlinkSync(path.join(docsPath, file));
                }
            }
            console.log('✅ partner_docs folder cleared.');
        } else {
            console.log('⚠️ partner_docs folder not found.');
        }

        console.log('🏁 RESET COMPLETE. Restart the backend to recreate Admin.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed error details below:');
        console.error(err);
        process.exit(1);
    }
};

reset();
