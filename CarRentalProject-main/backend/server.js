const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const User = require('./models/User');

// Middlewares
const errorMiddleware = require('./middleware/errorMiddleware');

// Route Files
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const sosRoutes = require('./routes/sosRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// App Initialization
const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static folder for Multer uploads & PDF generated files
// This allows the frontend to access images/PDFs directly via URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------------------------------------------
// ROUTE MOUNTING (The 6 Modules)
// -----------------------------------------------------------
app.use('/api/auth', authRoutes);               // Authentication
app.use('/api/cars', carRoutes);                // Module 6 - Cars Setup
app.use('/api/bookings', bookingRoutes);        // Module 1 - Booking & Payment
app.use('/api/destinations', destinationRoutes);// Module 2 - Destinations
app.use('/api/trips', timetableRoutes);         // Module 3 - Timetable
app.use('/api/fuel', fuelRoutes);               // Module 4 - Fuel Tracking
app.use('/api/sos', sosRoutes);                 // Module 6 - Emergency SOS
app.use('/api/checkout', checkoutRoutes);       // Module 5 - Final Checkout
app.use('/api/reviews', reviewRoutes);          // Customer Reviews

// Basic Health Check Route
app.get('/', (req, res) => {
    res.send('Car Rental API is running. Ready for React Native connections.');
});

// Default Error Handler (must be the last middleware)
app.use(errorMiddleware);

// -----------------------------------------------------------
// MONGODB CONNECTION & SERVER START
// -----------------------------------------------------------
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected Successfully');
        
        // Ensure Default Admin Exists
        try {
            const adminExists = await User.findOne({ email: 'admin@carrental.com' });
            if (!adminExists) {
                await User.create({
                    name: 'Super Admin',
                    email: 'admin@carrental.com',
                    password: 'AdminPassword123!',
                    role: 'admin',
                    phone: '0000000000'
                });
                console.log('👑 Default Admin Account securely provisioned: admin@carrental.com');
            }
        } catch (seedError) {
            console.error('Failed to seed default admin:', seedError.message);
        }

        // Start server only after DB is connected
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log('❌ MongoDB Connection Error:', err.message);
        process.exit(1); 
    });