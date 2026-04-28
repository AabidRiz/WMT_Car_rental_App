import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

// Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import UserSOSScreen from '../screens/trip/UserSOSScreen';

import HomeScreen from '../screens/booking/HomeScreen';
import CarDetailsScreen from '../screens/booking/CarDetailsScreen';
import BookingScreen from '../screens/booking/BookingScreen';
import BookingSuccessScreen from '../screens/booking/BookingSuccessScreen';
import MyBookingsScreen from '../screens/booking/MyBookingsScreen';

import DestinationsScreen from '../screens/trip/DestinationsScreen';
import TimetableScreen from '../screens/trip/TimetableScreen';
import TripPlannerScreen from '../screens/trip/TripPlannerScreen';
import MyTripsScreen from '../screens/trip/MyTripsScreen';
import LiveTripScreen from '../screens/trip/LiveTripScreen';

import FuelTrackerScreen from '../screens/fuel/FuelTrackerScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';

// Admin Screens
import AdminInventoryScreen from '../screens/admin/AdminInventoryScreen';
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AdminSOSScreen from '../screens/admin/AdminSOSScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import Preloader from '../components/Preloader';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 10,
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Destinations') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'MyBookings') iconName = focused ? 'bookmark' : 'bookmark-outline';
          else if (route.name === 'Fuel') iconName = focused ? 'water' : 'water-outline';
          else if (route.name === 'SOS') iconName = focused ? 'warning' : 'warning-outline';
          
          return <Ionicons name={iconName} size={size} color={route.name === 'SOS' ? COLORS.error : color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Destinations" component={DestinationsScreen} />
      <Tab.Screen name="MyBookings" component={MyBookingsScreen} options={{ tabBarLabel: 'My Bookings' }} />
      <Tab.Screen name="Fuel" component={FuelTrackerScreen} />
      <Tab.Screen name="SOS" component={UserSOSScreen} />
    </Tab.Navigator>
  );
};

const AdminTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 10,
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Inventory') iconName = focused ? 'car-sport' : 'car-sport-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'SOS') iconName = focused ? 'warning' : 'warning-outline';
          else if (route.name === 'Reviews') iconName = focused ? 'star' : 'star-outline';
          
          return <Ionicons name={iconName} size={size} color={route.name === 'SOS' ? COLORS.error : color} />;
        },
      })}
    >
      <Tab.Screen name="Inventory" component={AdminInventoryScreen} />
      <Tab.Screen name="Bookings" component={AdminBookingsScreen} />
      <Tab.Screen name="Reviews" component={AdminReviewsScreen} />
      <Tab.Screen name="SOS" component={AdminSOSScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, splashLoading } = useContext(AuthContext);

  if (splashLoading) return <Preloader />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background }, animation: 'fade_from_bottom' }}>
        {user ? (
          user.role === 'admin' ? (
            <>
              <Stack.Screen name="AdminTabs" component={AdminTabs} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="CarDetails" component={CarDetailsScreen} />
              <Stack.Screen name="Booking" component={BookingScreen} />
              <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
              <Stack.Screen name="Timetable" component={TimetableScreen} />
              <Stack.Screen name="TripPlanner" component={TripPlannerScreen} />
              <Stack.Screen name="MyTrips" component={MyTripsScreen} />
              <Stack.Screen name="LiveTrip" component={LiveTripScreen} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
            </>
          )
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
