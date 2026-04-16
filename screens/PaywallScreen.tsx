import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const PACKS = [
  { id: "single", label: "1 Scan", price: "$0.99", description: "Try it out" },
  {
    id: "fivepack",
    label: "5 Scans",
    price: "$2.99",
    description: "Best value — save 40%",
  },
];

export default function PaywallScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string>("fivepack");
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Not logged in");
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pack: selected }),
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);

      // Open Stripe checkout in browser
      await Linking.openURL(url);
      // When they come back via deep link (mvb://purchase-success), navigate away
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Get More Scans</Text>
      <Text style={styles.subtitle}>One-time purchase, never expires</Text>

      <View style={styles.packs}>
        {PACKS.map((pack) => (
          <TouchableOpacity
            key={pack.id}
            style={[styles.pack, selected === pack.id && styles.packSelected]}
            onPress={() => setSelected(pack.id)}
          >
            <Text
              style={[
                styles.packLabel,
                selected === pack.id && styles.packLabelSelected,
              ]}
            >
              {pack.label}
            </Text>
            <Text
              style={[
                styles.packPrice,
                selected === pack.id && styles.packPriceSelected,
              ]}
            >
              {pack.price}
            </Text>
            <Text style={styles.packDescription}>{pack.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.buyButton, loading && styles.buyButtonDisabled]}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0f0f0f" />
        ) : (
          <Text style={styles.buyText}>Buy Scans</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.legal}>
        Secure payment via Stripe. Credits never expire.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 24,
    paddingTop: 60,
  },
  closeButton: { alignSelf: "flex-end", padding: 8 },
  closeText: { color: "#888", fontSize: 18 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginTop: 16 },
  subtitle: { color: "#888", fontSize: 14, marginTop: 8, marginBottom: 32 },
  packs: { gap: 16, marginBottom: 32 },
  pack: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  packSelected: { borderColor: "#f5c518" },
  packLabel: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  packLabelSelected: { color: "#f5c518" },
  packPrice: { color: "#888", fontSize: 18, marginTop: 4 },
  packPriceSelected: { color: "#fff" },
  packDescription: { color: "#555", fontSize: 13, marginTop: 6 },
  buyButton: {
    backgroundColor: "#f5c518",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buyButtonDisabled: { opacity: 0.6 },
  buyText: { color: "#0f0f0f", fontWeight: "bold", fontSize: 16 },
  legal: { color: "#555", fontSize: 12, textAlign: "center", marginTop: 16 },
});
