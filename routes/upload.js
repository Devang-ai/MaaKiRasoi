const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage, cloudinary } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// POST /api/upload/base64 — Upload base64 image directly to Cloudinary
router.post('/base64', auth, async (req, res) => {
    try {
        const { base64 } = req.body;
        if (!base64) {
            return res.status(400).json({ message: 'No base64 data provided' });
        }

        // 🔍 Diagnostic check: If the client sends a local URI instead of data
        if (typeof base64 !== 'string') {
            console.error('CRITICAL: Received non-string base64 data!', typeof base64);
            return res.status(400).json({ message: 'Invalid data format. Expected base64 string.' });
        }

        if (base64.startsWith('file://') || base64.startsWith('content://')) {
            console.error('CRITICAL: Client sent local URI instead of Base64 data!', base64.substring(0, 100));
            return res.status(400).json({ 
                message: 'Client Sync Error: The server received a local file path instead of image data. Please ensure your app is sending actual base64 content.' 
            });
        }

        console.log(`Starting base64 upload to Cloudinary. Data starts with: ${base64.substring(0, 50)}...`);

        // Upload to Cloudinary using the base64 string
        // Note: The string should be in the format "data:image/jpeg;base64,..."
        const uploadResponse = await cloudinary.uploader.upload(base64, {
            folder: 'maakirasoi_docs',
            resource_type: 'auto',
        });

        res.status(200).json({
            message: 'Image uploaded successfully via Base64',
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id
        });
    } catch (error) {
        console.error('Base64 Upload Error:', error);
        res.status(500).json({ message: error.message || 'Failed to upload base64 image' });
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
}).single('file');

// POST /api/upload/restaurant-docs — Upload directly to Cloudinary
router.post('/restaurant-docs', auth, (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File is too large. Maximum limit is 10MB.' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(500).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // multer-storage-cloudinary automatically uploads and provides req.file.path as the URL
        res.status(200).json({
            message: 'File uploaded successfully to Cloudinary',
            url: req.file.path, // This is the persistent Cloudinary HTTPS URL
            filename: req.file.filename
        });
    });
});

module.exports = router;
