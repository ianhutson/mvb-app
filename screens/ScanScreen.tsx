import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type Stage = 'input' | 'preview' | 'loading' | 'error';

export default function ScanScreen({ navigation }: any) {
  const [restaurantName, setRestaurantName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('input');
  const [errorMessage, setErrorMessage] = useState('');

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan menus.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setStage('preview');
    }
  }

  async function openLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setStage('preview');
    }
  }

  async function submitScan() {
    if (!restaurantName.trim()) {
      Alert.alert('Missing info', 'Please enter the restaurant name.');
      return;
    }
    if (!imageBase64) {
      Alert.alert('Missing image', 'Please take or choose a photo first.');
      return;
    }

    setStage('loading');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Not logged in');
        setStage('preview');
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-menu`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_name: restaurantName.trim(),
          image_base64: imageBase64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong.');
        setStage('error');
        return;
      }

      // Reset for next scan
      setImage(null);
      setImageBase64(null);
      setRestaurantName('');
      setStage('input');

      navigation.navigate('Results', { data });
    } catch (e: any) {
      setErrorMessage(e.message);
      setStage('error');
    }
  }

  function reset() {
    setImage(null);
    setImageBase64(null);
    setStage('input');
    setErrorMessage('');
  }

  // LOADING STATE
  if (stage === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f5c518" />
        <Text style={styles.loadingTitle}>Analyzing menu...</Text>
        <Text style={styles.loadingSubtitle}>Claude is reading your menu</Text>
      </View>
    );
  }

  // ERROR STATE
  if (stage === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Scan failed</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <TouchableOpacity style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Scan a Menu</Text>

        {/* Restaurant name input */}
        <Text style={styles.label}>Bar or restaurant name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Tap Room"
          placeholderTextColor="#555"
          value={restaurantName}
          onChangeText={setRestaurantName}
        />

        {/* Image preview or pick buttons */}
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} />
            <TouchableOpacity style={styles.changePhoto} onPress={reset}>
              <Text style={styles.changePhotoText}>Change photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageButtons}>
            <Text style={styles.label}>Menu photo</Text>
            <TouchableOpacity style={styles.button} onPress={openCamera}>
              <Text style={styles.buttonText}>📷  Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={openLibrary}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>🖼️  Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit */}
        {stage === 'preview' && (
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={submitScan}
          >
            <Text style={styles.buttonText}>Analyze Menu →</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f0f0f',
    padding: 24,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  imageButtons: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#f5c518',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0f0f0f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#1e1e1e',
  },
  secondaryButtonText: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  previewContainer: {
    marginBottom: 24,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  changePhoto: {
    alignItems: 'center',
    padding: 8,
  },
  changePhotoText: {
    color: '#888',
    fontSize: 14,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  loadingSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#555',
    fontSize: 14,
  },
});