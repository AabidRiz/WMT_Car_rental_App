# DriveMate: Smart Travel & Vehicle Assistance Management System

DriveMate is a comprehensive, production-ready full-stack mobile application designed to streamline the car rental experience. It integrates vehicle management, trip planning, real-time tracking, and emergency assistance into a single unified platform.

## 🚀 Core Features & Integrated Modules

The system is built around 6 interconnected modules that follow a logical story-based data flow:

1.  **Fleet Management & Admin Control**: Admins manage the vehicle inventory, setting critical parameters like price per day, fuel efficiency (km/L), and tank capacity.
2.  **Booking & Smart Payments**: Users can browse cars, select rental dates, and upload bank transfer receipts. The system calculates base prices and generates professional PDF invoices upon admin approval.
3.  **Destination Exploration**: A curated list of tourist destinations in Sri Lanka. Users can explore spots and add them directly to their upcoming trip plans.
4.  **Interactive Trip Planner & Timetable**: Users can schedule their itineraries day-by-day.
    *   **Map Logic**: The system uses a **Simulated Google Maps Distance Matrix API** logic. It mathematically calculates travel durations and distances between consecutive stops to provide a realistic schedule without incurring external API costs during the development phase.
    *   **Ticket Management**: Users can upload photos of entrance tickets or safari passes directly to each stop.
    *   **Smart Reminders**: Simulated push notification logic alerts users about upcoming scheduled stops.
5.  **Intelligent Fuel Tracking**: Integrates with the Booking module to fetch the car's fuel efficiency. It calculates real-time range (km remaining) and tank percentage based on user logs.
6.  **Emergency SOS & Incident Reporting**:
    *   **Emergency Dial**: Uses the **Native Linking API** to instantly trigger the device's dialer to call emergency services (119) with a single tap.
    *   **GPS Integration**: Uses the **Expo Location API** to capture precise GPS coordinates during accidents or breakdowns.
    *   **Damage Reporting**: Users can upload real-time photos of damages. The admin side provides a full-screen image viewer for detailed inspection and can generate formal PDF Accident Reports.

---

## 🛠 Tech Stack

### Backend (Node.js & Express)
- **Express.js**: RESTful API architecture.
- **MongoDB & Mongoose**: Scalable NoSQL database with strict schema validation.
- **JWT & Bcrypt**: Secure token-based authentication and password hashing.
- **Multer**: Sophisticated multipart file handling with dynamic directory nesting.
- **PDFKit**: Automated server-side generation of Invoices and Reports.

### Frontend (React Native & Expo)
- **React Native (Expo)**: Cross-platform mobile development.
- **Context API**: Global state management for authentication and user preferences.
- **React Navigation**: Seamless stack and tab-based navigation.
- **Reanimated & Lucide**: Smooth micro-animations and modern iconography.
- **Axios**: Robust HTTP client for backend communication.

---

## 📁 Project Structure

### Root Directory
- `backend/`: Node.js server and API logic.
- `frontend/`: React Native mobile application.
- `README.md`: Project documentation.

### Backend Structure
- `server.js`: Application entry point and route mounting.
- `controllers/`: Core business logic for each of the 6 modules.
- `models/`: MongoDB schemas (User, Car, Booking, TripPlan, SOS, etc.).
- `routes/`: API endpoint definitions.
- `middleware/`: Authentication and file upload processors.
- `uploads/`: Organized storage for car images, receipts, and PDF exports.

### Frontend Structure
- `App.js`: Root component with navigation providers.
- `src/screens/`: Feature-specific screens (Booking, Trip, Admin, etc.).
- `src/components/`: Reusable UI elements (Modals, Custom Buttons, Reviews).
- `src/context/`: Authentication and Global State providers.
- `src/theme/`: Centralized design system (Colors, Shadows, Typography).

---

## 🔧 Installation & Setup

1.  **Backend**:
    ```bash
    cd backend
    npm install
    npm run dev
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npx expo start
    ```

---

## ⚖️ System Logic & Math
The system relies on several custom algorithms:
- **Price Calculation**: `(PricePerDay * Days) + AddOns`.
- **Fuel Math**: `(CurrentFuel / TankCapacity) * 100` for percentage; `CurrentFuel * kmPerLiter` for range.
- **Penalty Logic**: Automated 10% penalty calculation for cancellations of approved bookings.
