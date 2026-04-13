require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const menuRoutes = require('./routes/menu');
const userRoutes = require('./routes/users');
const riderRoutes = require('./routes/riders');
const complaintRoutes = require('./routes/complaints');
const orderRoutes = require('./routes/orders');
const cuisinesRoutes = require('./routes/cuisines');
const partnerAuthRoutes = require('./routes/partner-auth');
const partnerChatRoutes = require('./routes/partner-chat');
const riderChatRoutes = require('./routes/rider-chat');
const uploadRoutes = require('./routes/upload');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Socket.io logic
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User joins their own private room (for order status, subscription updates)
    socket.on('join', (userId) => {
        socket.join(String(userId));
        console.log(`User ${userId} joined their room`);
    });

    // Partner joins their own room for real-time chat + menu/order updates
    socket.on('join_partner', (partnerId) => {
        socket.join(`partner_${partnerId}`);
        console.log(`Partner ${partnerId} joined partner room`);
    });

    // UserApp joins a restaurant room to get real-time menu availability updates
    socket.on('join_restaurant', (restaurantId) => {
        socket.join(`restaurant_${restaurantId}`);
        console.log(`Client joined restaurant room: ${restaurantId}`);
    });

    // UserApp leaves restaurant room when navigating away
    socket.on('leave_restaurant', (restaurantId) => {
        socket.leave(`restaurant_${restaurantId}`);
    });

    // User/Admin joins a specific order room for real-time tracking
    socket.on('join_order', (orderId) => {
        socket.join(`order_${orderId}`);
        console.log(`Joined order room: ${orderId}`);
    });

    // Admin joins admin room
    socket.on('join_admin', () => {
        socket.join('Admin');
        console.log('Admin joined Admin room');
    });
    
    // Rider joins their own room and the Global Riders room
    socket.on('join_rider', (riderId) => {
        socket.join(`rider_${riderId}`);
        socket.join('all_riders');
        console.log(`Rider ${riderId} joined rider room`);
    });

    // Handle rider location updates
    socket.on('update_location', async (data) => {
        const { riderId, location, orderId } = data;
        
        // Broadcast to admin
        io.to('Admin').emit('rider_location_update', { riderId, location, orderId });
        
        // Broadcast to specific order room (for the User)
        if (orderId) {
            io.to(`order_${orderId}`).emit('rider_location_update', { riderId, location });
        }

        // Periodically update DB (throttled logic would be better but keeping it simple for now)
        try {
            const Rider = require('./models/Rider');
            await Rider.findOneAndUpdate(
                { riderId },
                { 
                    location: { lat: location.latitude, lng: location.longitude },
                    lastUpdated: new Date()
                }
            );
        } catch (err) {
            console.error('Error updating rider location in DB:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root route for verification
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to MaaKiRasoi REAL Backend V2 (MongoDB)' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/users', userRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/cuisines', cuisinesRoutes);
app.use('/api/auth/partner', partnerAuthRoutes);
app.use('/api/partner-chat', partnerChatRoutes);
app.use('/api/rider-chat', riderChatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscription-plans', require('./routes/subscriptionPlans'));

// Debugging fallback for API routes
app.use('/api/*', (req, res) => {
    console.log(`404 at ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'partner_docs')));

// Database Connection
const ensureAdminExists = async () => {
    try {
        const Admin = require('./models/Admin');
        const adminEmail = 'admin@gmail.com';
        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (!existingAdmin) {
            const admin = new Admin({
                name: 'Admin',
                email: adminEmail,
                password: 'admin123',
                role: 'Admin'
            });
            await admin.save();
            console.log('✅ Admin user created automatically on startup');
        }
    } catch (err) {
        console.error('❌ Error ensuring admin user exists:', err);
    }
};

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
        console.log('Connected to MongoDB');
        await ensureAdminExists();

        // Expire subscriptions automatically
        setInterval(async () => {
            try {
                const User = require('./models/User');
                const Activity = require('./models/Activity');
                
                // Fetch anyone active
                const users = await User.find({ "subscription.status": "active" });
                const today = new Date();
                
                for(let u of users) {
                    if (u.subscription && u.subscription.endDate) {
                        try {
                            const [month, day, year] = u.subscription.endDate.split('/');
                            // Convert standard MM/DD/YYYY or DD/MM/YYYY carefully
                            const endDate = new Date(u.subscription.endDate);
                            
                            // Let's assume the locale date string parses normally. If it's valid:
                            if (!isNaN(endDate.getTime())) {
                                // Add 24 hours to endDate so it expires at Midnight strictly AFTER the day is over
                                endDate.setHours(23, 59, 59, 999);
                                
                                if (endDate < today) {
                                    u.subscription = null;
                                    await u.save();
                                    
                                    await Activity.create({
                                        type: 'Subscription',
                                        description: `${u.name}'s plan expired naturally and was deleted.`,
                                        time: new Date()
                                    });
                                    
                                    if (io) {
                                        io.emit('subscription_update', u);
                                        io.emit('dashboardUpdate');
                                    }
                                    console.log(`Auto-cancelled expired plan for: ${u.name}`);
                                }
                            }
                        } catch (dateErr) {
                            console.error("Date parse error for", u.name);
                        }
                    }
                }
            } catch (err) {
                console.error("Cron Error: ", err);
            }
        }, 1000 * 60 * 60); // Run every 1 Hour
    })
    .catch(err => console.error('Could not connect to MongoDB', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
