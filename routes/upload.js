const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const auth = require('../middleware/auth');

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
