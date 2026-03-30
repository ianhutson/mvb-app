import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ScanScreen from './screens/ScanScreen';
import ResultsScreen from './screens/ResultsScreen';
import HistoryScreen from './screens/HistoryScreen';
import ScanDetailScreen from './screens/ScanDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaywallScreen from './screens/PaywallScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY!;
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY!;

function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Image source={require('./assets/icon-new.png')} style={{ width: 140, height: 140, borderRadius: 28 }} />
      <Text style={styles.subtitle}>Most Valuable Beer</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.buttonText}>📷  Scan a Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1e1e1e' },
        tabBarActiveTintColor: '#f5c518',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text>🏠</Text> }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'History', tabBarIcon: () => <Text>🕓</Text> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text>👤</Text> }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabNavigator} />
      <AppStack.Screen name="Scan" component={ScanScreen} />
      <AppStack.Screen name="Results" component={ResultsScreen} />
      <AppStack.Screen name="ScanDetail" component={ScanDetailScreen} />
      <AppStack.Screen name="Paywall" component={PaywallScreen} />
    </AppStack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: RC_IOS_KEY });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: RC_ANDROID_KEY });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user?.id) {
        Purchases.logIn(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      if (session?.user?.id) {
        Purchases.logIn(session.user.id);
      } else {
        Purchases.logOut();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 48 },
  button: { backgroundColor: '#f5c518', borderRadius: 8, padding: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: '#0f0f0f', fontWeight: 'bold', fontSize: 16 },
  logo: { width: 140, height: 140, marginBottom: 8 },
});