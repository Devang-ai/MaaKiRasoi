const express = require('express');
const router = express.Router();
const Cuisine = require('../models/Cuisine');

// GET all active cuisines
router.get('/', async (req, res) => {
    try {
        const cuisines = await Cuisine.find({ isActive: true }).sort('name');
        res.json(cuisines);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
