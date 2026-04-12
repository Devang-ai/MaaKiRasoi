const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require(path.join(__dirname, '../models/User'));
const Restaurant = require(path.join(__dirname, '../models/Restaurant'));
const MenuItem = require(path.join(__dirname, '../models/MenuItem'));
const Order = require(path.join(__dirname, '../models/Order'));
const Rider = require(path.join(__dirname, '../models/Rider'));
const Cuisine = require(path.join(__dirname, '../models/Cuisine'));
const Complaint = require(path.join(__dirname, '../models/Complaint'));
const Chat = require(path.join(__dirname, '../models/Chat'));
const Activity = require(path.join(__dirname, '../models/Activity'));

const CUISINES = [
    { name: 'North Indian', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80' },
    { name: 'South Indian', image: 'https://images.unsplash.com/photo-1610192202611-3d7197b10204?auto=format&fit=crop&w=800&q=80' },
    { name: 'Street Food', image: 'https://images.unsplash.com/photo-1626132646544-6725287f3944?auto=format&fit=crop&w=800&q=80' },
    { name: 'Gujarati', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80' },
    { name: 'Rajasthani', image: 'https://images.unsplash.com/photo-1596797038530-2c396c096773?auto=format&fit=crop&w=800&q=80' },
    { name: 'Maharashtrian', image: 'https://images.unsplash.com/photo-1601050633647-8f8f1f3dc25b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Bengali', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80' },
    { name: 'Home Style', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80' }
];

const RESTAURANTS = [
    {
        name: "Lajawab Delhi Darbar", ownerName: "Rajeev Kumar", email: "delhidarbar@example.com", phone: "9876543201",
        city: "Delhi", address: "Chandni Chowk, Delhi", isVeg: false, rating: 4.8, cuisineName: 'North Indian',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Butter Chicken", price: 380, isVeg: false, category: "Main Course", description: "Rich, creamy chicken curry." },
            { name: "Paneer Tikka", price: 220, isVeg: true, category: "Starters", description: "Grilled cottage cheese." }
        ]
    },
    {
        name: "Madras Tiffin Center", ownerName: "Venkatesh Iyer", email: "madrastiffins@example.com", phone: "9876543202",
        city: "Delhi", address: "Karol Bagh, Delhi", isVeg: true, rating: 4.7, cuisineName: 'South Indian',
        image: 'https://images.unsplash.com/photo-1610192202611-3d7197b10204?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Masala Dosa", price: 160, isVeg: true, category: "Main Course", description: "Crispy crepe with potato mash." },
            { name: "Idli Sambar", price: 100, isVeg: true, category: "Breakfast", description: "Steamed rice cakes." }
        ]
    },
    {
        name: "Amritsar Da Dhaba", ownerName: "Gurpreet Singh", email: "amritsardhaba@example.com", phone: "9876543203",
        city: "Delhi", address: "Outer Ring Road, Delhi", isVeg: false, rating: 4.6, cuisineName: 'North Indian',
        image: 'https://images.unsplash.com/photo-1596797038530-2c396c096773?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Dal Makhani", price: 240, isVeg: true, category: "Main Course", description: "Slow cooked black lentils." },
            { name: "Tandoori Chicken", price: 420, isVeg: false, category: "Starters", description: "Classic roasted chicken." }
        ]
    },
    {
        name: "Kathiyawadi Rasoi", ownerName: "Hitesh Patel", email: "kathiyawadi@example.com", phone: "9876543204",
        city: "Delhi", address: "Rohini, Delhi", isVeg: true, rating: 4.5, cuisineName: 'Gujarati',
        image: 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Dhokla", price: 120, isVeg: true, category: "Snacks", description: "Steamed gram flour cakes." },
            { name: "Gujarati Thali", price: 300, isVeg: true, category: "Main Course", description: "Full Gujarati meal." }
        ]
    },
    {
        name: "Rajwada Thali", ownerName: "Vikram Rathore", email: "rajwada@example.com", phone: "9876543205",
        city: "Delhi", address: "Connaught Place, Delhi", isVeg: true, rating: 4.9, cuisineName: 'Rajasthani',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Dal Baati Churma", price: 350, isVeg: true, category: "Main Course", description: "Traditional Rajasthani meal." }
        ]
    },
    {
        name: "Pune Misal House", ownerName: "Anil Deshmukh", email: "punemisal@example.com", phone: "9876543206",
        city: "Delhi", address: "Dwarka, Delhi", isVeg: true, rating: 4.4, cuisineName: 'Maharashtrian',
        image: 'https://images.unsplash.com/photo-1601050633647-8f8f1f3dc25b?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Misal Pav", price: 140, isVeg: true, category: "Snacks", description: "Spicy sprout curry with bread." },
            { name: "Vada Pav", price: 60, isVeg: true, category: "Snacks", description: "Spiced potato fritter in bun." }
        ]
    },
    {
        name: "Kolkata Rasoi", ownerName: "Subhojit Das", email: "kolkatarasoi@example.com", phone: "9876543207",
        city: "Delhi", address: "Chittaranjan Park, Delhi", isVeg: false, rating: 4.7, cuisineName: 'Bengali',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Fish Curry", price: 320, isVeg: false, category: "Main Course", description: "Traditional Bengali fish curry." },
            { name: "Rosogolla (2 pcs)", price: 80, isVeg: true, category: "Dessert", description: "Soft cheese balls in syrup." }
        ]
    },
    {
        name: "Chaat Corner", ownerName: "Sanjay Gupta", email: "chaatcorner@example.com", phone: "9876543208",
        city: "Delhi", address: "Lajpat Nagar, Delhi", isVeg: true, rating: 4.5, cuisineName: 'Street Food',
        image: 'https://images.unsplash.com/photo-1626132646544-6725287f3944?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Golgappa", price: 50, isVeg: true, category: "Snacks", description: "Crispy hollow balls with water." },
            { name: "Aloo Tikki", price: 70, isVeg: true, category: "Snacks", description: "Crispy potato patties." }
        ]
    },
    {
        name: "Ghar Ka Khana", ownerName: "Meena Devi", email: "gharkakhana@example.com", phone: "9876543209",
        city: "Delhi", address: "Janakpuri, Delhi", isVeg: true, rating: 4.8, cuisineName: 'Home Style',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Rajma Chawal", price: 150, isVeg: true, category: "Main Course", description: "Red kidney beans with rice." },
            { name: "Kadahi Paneer", price: 200, isVeg: true, category: "Main Course", description: "Paneer cooked in wok." }
        ]
    },
    {
        name: "Pind Balluchi", ownerName: "Jasbir Singh", email: "pindballuchi@example.com", phone: "9876543210",
        city: "Delhi", address: "Saket, Delhi", isVeg: false, rating: 4.6, cuisineName: 'North Indian',
        image: 'https://images.unsplash.com/photo-1596797038530-2c396c096773?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Soya Chaap", price: 220, isVeg: true, category: "Starters", description: "Marinated soya grilled." }
        ]
    },
    {
        name: "Kerala Spice Kitchen", ownerName: "Thomas Mathew", email: "keralaspice@example.com", phone: "9876543211",
        city: "Delhi", address: "Mayur Vihar, Delhi", isVeg: false, rating: 4.7, cuisineName: 'South Indian',
        image: 'https://images.unsplash.com/photo-1596797038530-2c396c096773?auto=format&fit=crop&w=800&q=80',
        menu: [
            { name: "Appam with Stew", price: 280, isVeg: true, category: "Main Course", description: "Rice pancake with stew." }
        ]
    }
];

const seedData = async () => {
    try {
        const uri = 'mongodb://127.0.0.1:27017/maakirasoi';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB for expanded seeding...');

        // Clear existing data (except Admin)
        await User.deleteMany({ role: { $ne: 'Admin' } });
        await Cuisine.deleteMany({});
        await Restaurant.deleteMany({});
        await MenuItem.deleteMany({});
        await Order.deleteMany({});
        await Rider.deleteMany({});
        await Complaint.deleteMany({});
        await Chat.deleteMany({});
        await Activity.deleteMany({});

        console.log('Cleared existing data.');

        // 1. Create Cuisines
        const cuisineMap = {};
        for (const cData of CUISINES) {
            const cuisine = await Cuisine.create(cData);
            cuisineMap[cuisine.name] = cuisine._id;
        }
        console.log('Cuisines created.');

        // 2. Create Restaurants & Menus
        const restaurants = [];
        const menuItemsMap = {}; // resId -> [items]
        for (const resData of RESTAURANTS) {
            const { menu, cuisineName, ...restaurantInfo } = resData;
            const restaurant = new Restaurant({
                ...restaurantInfo,
                cuisine: cuisineMap[cuisineName],
                status: 'active'
            });
            const savedRes = await restaurant.save();
            restaurants.push(savedRes);
            
            menuItemsMap[savedRes._id] = [];
            for (const item of menu) {
                const savedItem = await new MenuItem({
                    ...item,
                    restaurantId: savedRes._id,
                    isAvailable: true,
                    image: 'https://via.placeholder.com/150'
                }).save();
                menuItemsMap[savedRes._id].push(savedItem);
            }
        }
        console.log('Restaurants and menus created.');

        // 2b. Create 10 Pending Restaurants
        for (let i = 1; i <= 10; i++) {
            await new Restaurant({
                name: `Pending Resto ${i}`,
                ownerName: `Owner ${i}`,
                email: `pending${i}@example.com`,
                phone: `9000000${String(i).padStart(3, '0')}`,
                city: "Delhi",
                address: `Pending Address ${i}, Delhi`,
                cuisine: restaurants[i % restaurants.length].cuisine,
                status: 'pending'
            }).save();
        }
        console.log('10 Pending Restaurants created.');

        // 3. Create 20 Users
        const passwordHash = await bcrypt.hash('password123', 10);
        const customers = [];
        for (let i = 1; i <= 20; i++) {
            const isSubscribed = i <= 10;
            const subRestaurant = isSubscribed ? restaurants[i % restaurants.length] : null;

            const userData = {
                name: `User ${i}`,
                email: `user${i}@example.com`,
                phone: `9999999${String(i).padStart(3, '0')}`,
                password: passwordHash,
                role: 'Customer',
                status: 'Active',
                addresses: [{ id: `addr${i}`, type: 'Home', text: `Street ${i}, Delhi`, details: `Flat ${100 + i}` }]
            };

            if (isSubscribed) {
                userData.subscription = {
                    plan: `${subRestaurant.name} - Premium Plan`,
                    mealsPerDay: 2,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                    status: 'active'
                };
            }

            const user = await new User(userData).save();
            customers.push(user);
        }
        console.log('20 Users created (10 with active subscriptions).');

        // 4. Create 10 Riders
        const ridersList = [];
        for (let i = 1; i <= 10; i++) {
            const rider = await new Rider({
                name: `Rider ${i}`,
                phone: `8888888${String(i).padStart(3, '0')}`,
                vehicle: i % 2 === 0 ? 'Bike' : 'Scooter',
                status: i % 3 === 0 ? 'On Delivery' : 'Available',
                rating: (4 + Math.random()).toFixed(1)
            }).save();
            ridersList.push(rider);
        }
        console.log('10 Riders created.');

        // 4b. Create 10 Pending Riders
        for (let i = 11; i <= 20; i++) {
            await new Rider({
                name: `Applicant ${i}`,
                phone: `7777777${String(i).padStart(3, '0')}`,
                vehicle: i % 2 === 0 ? 'Bike' : 'Bicycle',
                status: 'Pending',
                documents: 'Aadhar Card, Driving License'
            }).save();
        }
        console.log('10 Pending Riders (Applicants) created.');

        // 5. Create 20 Orders
        const statuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
        for (let i = 1; i <= 20; i++) {
            const user = customers[i-1];
            const res = restaurants[Math.floor(Math.random() * restaurants.length)];
            const items = menuItemsMap[res._id];
            const item = items[Math.floor(Math.random() * items.length)];
            const status = statuses[i % statuses.length];
            
            const order = new Order({
                userId: user.userId,
                customer: user.name,
                restaurantId: res._id,
                restaurant: res.name,
                items: [{ menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }],
                totalAmount: item.price,
                status: status
            });

            if (status === 'delivered' || status === 'out_for_delivery') {
                const rider = ridersList[Math.floor(Math.random() * ridersList.length)];
                order.riderId = rider.riderId;
                order.riderName = rider.name;
            }

            await order.save();
        }
        console.log('20 Orders created.');

        // 6. Create 15 Complaints
        const issues = ['Cold Food', 'Delayed Delivery', 'Missing Items', 'Wrong Order', 'Poor Quality'];
        for (let i = 1; i <= 15; i++) {
            const user = customers[i % 20];
            await new Complaint({
                userId: user.userId,
                customer: user.name,
                issue: issues[i % issues.length],
                details: `Test complaint details for record ${i}`,
                status: i % 4 === 0 ? 'Resolved' : 'Open',
                priority: i % 3 === 0 ? 'High' : (i % 2 === 0 ? 'Medium' : 'Low')
            }).save();
        }
        console.log('15 Complaints created.');

        // 7. Create 15 Chats (Support)
        for (let i = 1; i <= 15; i++) {
            const user = customers[i % 20];
            await new Chat({
                userId: user.userId,
                userName: user.name,
                status: 'Admin',
                messages: [
                    { sender: 'User', text: `Hi, I have a question about my order ${i}.`, timestamp: new Date(Date.now() - 3600000 * (16 - i)) },
                    { sender: 'Admin', text: `Hello ${user.name}, we are looking into it.`, timestamp: new Date(Date.now() - 3500000 * (16 - i)) }
                ]
            }).save();
        }
        console.log('15 Chat records created.');

        // 8. Create some initial Activity
        await Activity.create([
            { type: 'New Order', description: 'Recent spike in orders detected', time: new Date() },
            { type: 'Update', description: 'Menu updated for Lajawab Delhi Darbar', time: new Date(Date.now() - 1000 * 60 * 10) }
        ]);

        console.log('Expanded seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedData();
