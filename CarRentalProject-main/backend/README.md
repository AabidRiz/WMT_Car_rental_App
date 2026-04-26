# Smart Travel & Vehicle Assistance Management System (Backend)

This is the production-ready Node.js backend for the Smart Travel Car Rental System, built using Express.js and Mongoose.

## Tech Stack
- **Node.js + Express.js**: REST API routing.
- **Mongoose**: MongoDB object modeling.
- **bcryptjs & jsonwebtoken**: Authentication & Authorisation.
- **Multer**: Multipart file uploads for exactly 6 integrated modules.
- **PDFKit**: Automated invoice and checkout statement generation.

---

## The 6 Modules (Story Data Flow)

The system is interconnected. Data generated in one module directly computes results in the next:

1. **Admin Setup (Mod 6 - Ekanayake)**: Admin adds cars with `pricePerDay`, `kmPerLiter`, and `tankCapacity`. Up to 3 car images uploaded.
2. **Booking & Payment (Mod 1 - Aabid)**: User books dates. Base price calculated. Bank receipt uploaded. PDF Invoice generated upon Admin approval. Can be cancelled with a 10% penalty.
3. **Destinations (Mod 2 - Anuhas)**: User saves tourist spots, notes, and a cover photo. They click "Add to Trip Plan".
4. **Timetable (Mod 3 - Gunawardana)**: Picks up the Trip Plan. Simulated Google Maps calculates travel distances between stops. Entrance tickets uploaded. Simulated push notifications sent.
5. **Fuel Tracking (Mod 4 - Subanujan)**: User logs refill. Uses Booking logic to fetch Car's `kmPerLiter`. Math calculates "You are 80% full" and "150 km remaining".
6. **Emergency SOS (Mod 6 - Ekanayake)**: Flat tire. SOS triggered -> GPS saved. Admin alerted. Damage photo uploaded. Formal PDF Accident Report generated.
7. **Final Checkout (Mod 5 - Kulathunga)**: End trip. Odometer photo uploaded. Compared to start odometer. Over-limit mileage fee calculated + SOS damage penalties applied. PDF Final checkout bill generated.

---

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Duplicate `.env.example` to `.env` and adjust variables.

3. Run the development server:
   ```bash
   npm run dev
   ```

## VIVA Preparation
- Every Controller is heavily commented to explain the core business logic.
- The `errorMiddleware` neatly traps Mongo validation/duplicate errors to output friendly English messages instead of crashing the server.
- The `uploadMiddleware` creates separate, nested directories (e.g. `uploads/cars`, `uploads/fuel`) dynamically, avoiding naming collisions with timestamps. 
