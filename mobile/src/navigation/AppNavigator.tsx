import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MerchantHistoryScreen from '../screens/history/MerchantHistoryScreen';
import OrderQRScreen from '../screens/order/OrderQRScreen';
import SyncScreen from '../screens/sync/SyncScreen';
import AllHistoryScreen from '../screens/history/AllHistoryScreen';

import type {
  RootStackParamList,
  MainTabParamList,
  HomeStackParamList,
} from '../types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: 'My Merchants' }}
      />
      <HomeStack.Screen
        name="MerchantHistory"
        component={MerchantHistoryScreen}
        options={({ route }) => ({ title: route.params.merchant.name })}
      />
      <HomeStack.Screen
        name="OrderQR"
        component={OrderQRScreen}
        options={{ title: 'Show to Merchant' }}
      />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{ title: 'Merchants', tabBarLabel: 'Merchants' }}
      />
      <Tab.Screen
        name="History"
        component={AllHistoryScreen}
        options={{ title: 'All Receipts', tabBarLabel: 'Receipts' }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{ title: 'Sync Receipt', tabBarLabel: 'Sync' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading, loadFromStorage } = useAuthStore();

  React.useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <MainTabs />
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
