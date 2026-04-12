const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

// POST /auth/partner/register — New restaurant partner signup
router.post('/register', async (req, res) => {
    try {
        console.log('--- Partner Register Attempt ---');
        console.log('Body:', req.body);
        const { restaurantName, ownerName, email, phone, password, city, address, description } = req.body;

        const existing = await Restaurant.findOne({ email });
        if (existing) {
            console.log('Register Fail: Email exists');
            return res.status(400).json({ message: 'A restaurant with this email already exists.' });
        }

        const newRestaurant = new Restaurant({
            name: restaurantName,
            ownerName: ownerName || 'Partner',
            email,
            phone,
            password,
            city: (city && city.trim()) ? city : 'Delhi',
            address: (address && address.trim()) ? address : 'To be updated',
            description: description || '',
            status: 'pending',
            isVeg: false,
        });

        await newRestaurant.save();
        console.log('Partner Registered successfully:', newRestaurant.email);

        const activity = {
            type: 'New Restaurant',
            description: `New partner "${restaurantName}" registered and pending approval.`,
            time: new Date()
        };
        await Activity.create(activity);

        const io = req.app.get('io');
        if (io) {
            io.emit('dashboardUpdate');
            io.emit('newActivity', activity);
            io.emit('pendingRestaurantUpdate');
        }

        const token = jwt.sign(
            { id: newRestaurant._id, role: 'Partner', restaurantId: newRestaurant.restaurantId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            partner: {
                id: newRestaurant._id,
                restaurantId: newRestaurant.restaurantId,
                restaurantName: newRestaurant.name,
                ownerName: newRestaurant.ownerName,
                email: newRestaurant.email,
                phone: newRestaurant.phone,
                status: newRestaurant.status,
                isPaused: newRestaurant.isPaused,
                rating: newRestaurant.rating,
                isOnboardingCompleted: newRestaurant.isOnboardingCompleted,
            }
        });
    } catch (err) {
        console.error('Registration ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /auth/partner/login — Restaurant partner login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const restaurant = await Restaurant.findOne({ email }).select('+password');
        if (!restaurant) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Check if restaurant has a password (old records may not)
        if (!restaurant.password) {
            return res.status(401).json({ message: 'Account not registered via PartnerApp. Contact admin.' });
        }

        const isMatch = await restaurant.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: restaurant._id, role: 'Partner', restaurantId: restaurant.restaurantId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            partner: {
                id: restaurant._id,
                restaurantId: restaurant.restaurantId,
                restaurantName: restaurant.name,
                ownerName: restaurant.ownerName,
                email: restaurant.email,
                phone: restaurant.phone,
                status: restaurant.status,
                isPaused: restaurant.isPaused,
                rating: restaurant.rating,
                isOnboardingCompleted: restaurant.isOnboardingCompleted,
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/auth/partner/onboarding — Update restaurant onboarding data
router.patch('/onboarding', auth, async (req, res) => {
    try {
        const restaurantId = req.user.id;
        const updateData = req.body;

        console.log(`--- Onboarding Update for Restaurant: ${restaurantId} ---`);
        console.log('Update Data:', JSON.stringify(updateData, null, 2));

        // Create a flat update object for Mongoose
        const flattenedData = {};

        // Basic Info (Handle both flat and nested)
        console.log('Extracting Basic Info...');
        if (updateData.basicInfo) {
            console.log('Found basicInfo object:', updateData.basicInfo);
            if (updateData.basicInfo.restaurantName) flattenedData.name = updateData.basicInfo.restaurantName;
            if (updateData.basicInfo.ownerName) flattenedData.ownerName = updateData.basicInfo.ownerName;
            if (updateData.basicInfo.ownerMobile) flattenedData.ownerMobile = updateData.basicInfo.ownerMobile;
            if (updateData.basicInfo.contactNumber) flattenedData.contactNumber = updateData.basicInfo.contactNumber;
        } 
        
        // Also check root as backup
        if (updateData.ownerMobile) flattenedData.ownerMobile = updateData.ownerMobile;
        if (updateData.contactNumber) flattenedData.contactNumber = updateData.contactNumber;
        if (updateData.ownerName) flattenedData.ownerName = updateData.ownerName;
        if (updateData.name || updateData.restaurantName) flattenedData.name = updateData.name || updateData.restaurantName;

        // Set onboarding flag
        flattenedData.isOnboardingCompleted = true;

        // Address (Handle both flat and nested)
        console.log('Extracting Address Info...');
        if (updateData.address && typeof updateData.address === 'object') {
            console.log('Found address object:', updateData.address);
            if (updateData.address.fullAddress) flattenedData.address = updateData.address.fullAddress;
            if (updateData.address.landmark) flattenedData.landmark = updateData.address.landmark;
            if (updateData.address.city) flattenedData.city = updateData.address.city;
            if (updateData.address.state) flattenedData.state = updateData.address.state;
            if (updateData.address.pincode) flattenedData.pincode = updateData.address.pincode;
        }
        
        // Also check root as backup
        if (updateData.fullAddress || updateData.address && typeof updateData.address === 'string') {
            flattenedData.address = updateData.fullAddress || updateData.address;
        }
        if (updateData.landmark) flattenedData.landmark = updateData.landmark;
        if (updateData.city) flattenedData.city = updateData.city;
        if (updateData.state) flattenedData.state = updateData.state;
        if (updateData.pincode) flattenedData.pincode = updateData.pincode;

        console.log('Flattened Data for DB Update:', JSON.stringify(flattenedData, null, 2));

        // Documents
        if (updateData.documents) {
            if (updateData.documents.restaurantLicenseURL || updateData.documents.license) {
                flattenedData['documents.restaurantLicenseURL'] = updateData.documents.restaurantLicenseURL || updateData.documents.license;
            }
            if (updateData.documents.fssaiCertificateURL || updateData.documents.fssai) {
                flattenedData['documents.fssaiCertificateURL'] = updateData.documents.fssaiCertificateURL || updateData.documents.fssai;
            }
            if (updateData.documents.gstCertificateURL || updateData.documents.gst) {
                flattenedData['documents.gstCertificateURL'] = updateData.documents.gstCertificateURL || updateData.documents.gst;
            }
        }

        // Bank Details
        if (updateData.bankDetails) {
            if (updateData.bankDetails.pan) flattenedData['bankDetails.panNumber'] = updateData.bankDetails.pan;
            if (updateData.bankDetails.holderName) flattenedData['bankDetails.accountHolderName'] = updateData.bankDetails.holderName;
            if (updateData.bankDetails.accountNumber) flattenedData['bankDetails.accountNumber'] = updateData.bankDetails.accountNumber;
            if (updateData.bankDetails.ifsc) flattenedData['bankDetails.ifscCode'] = updateData.bankDetails.ifsc;
            if (updateData.bankDetails.cancelledChequeURL || updateData.bankDetails.cancelledCheque) {
                flattenedData['bankDetails.cancelledChequeURL'] = updateData.bankDetails.cancelledChequeURL || updateData.bankDetails.cancelledCheque;
            }
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            { $set: flattenedData },
            { new: true, runValidators: true }
        );

        if (!updatedRestaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        res.status(200).json({
            message: 'Onboarding data updated successfully',
            restaurant: updatedRestaurant
        });
    } catch (err) {
        console.error('Onboarding Update ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/auth/partner/me — Get current partner profile
router.get('/me', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.id).select('-password');
        if (!restaurant) return res.status(404).json({ message: 'Partner not found.' });
        res.json(restaurant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /auth/partner/pause — Partner pauses/resumes their store
router.patch('/pause', auth, async (req, res) => {
    try {
        const { isPaused } = req.body;
        const restaurant = await Restaurant.findByIdAndUpdate(
            req.user.id,
            { isPaused },
            { new: true }
        ).select('-password');
        if (!restaurant) return res.status(404).json({ message: 'Partner not found.' });

        const io = req.app.get('io');
        if (io) io.emit('restaurantUpdate', restaurant);

        res.json({ isPaused: restaurant.isPaused });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
