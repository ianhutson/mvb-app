import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen({ navigation }: any) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function loadOfferings() {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
          setSelected(offerings.current.availablePackages[0]?.identifier ?? null);
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load subscription options.');
      } finally {
        setLoading(false);
      }
    }
    loadOfferings();
  }, []);

  async function handlePurchase() {
    const pkg = packages.find(p => p.identifier === selected);
    if (!pkg) return;
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(pkg);
      navigation.goBack();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message);
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active['pro']) {
        Alert.alert('Restored!', 'Your pro subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('No subscription found', 'No active subscription was found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.title}>MVB Pro</Text>
      <Text style={styles.subtitle}>Unlimited beer menu scans</Text>

      <View style={styles.features}>
        <Text style={styles.feature}>🍺  Unlimited scans per month</Text>
        <Text style={styles.feature}>📜  Full scan history</Text>
        <Text style={styles.feature}>🏆  Best value rankings</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#f5c518" size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.packages}>
          {packages.map(pkg => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[styles.package, selected === pkg.identifier && styles.packageSelected]}
              onPress={() => setSelected(pkg.identifier)}
            >
              <Text style={[styles.packageTitle, selected === pkg.identifier && styles.packageTitleSelected]}>
                {pkg.packageType === 'ANNUAL' ? 'Annual' : 'Monthly'}
              </Text>
              <Text style={[styles.packagePrice, selected === pkg.identifier && styles.packagePriceSelected]}>
                {pkg.product.priceString}
                {pkg.packageType === 'ANNUAL' ? '/year' : '/month'}
              </Text>
              {pkg.packageType === 'ANNUAL' && (
                <Text style={styles.saveBadge}>Save 58%</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.subscribeButton, purchasing && styles.subscribeButtonDisabled]}
        onPress={handlePurchase}
        disabled={purchasing || loading}
      >
        {purchasing
          ? <ActivityIndicator color="#0f0f0f" />
          : <Text style={styles.subscribeText}>Subscribe</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        Subscriptions auto-renew unless cancelled. Cancel anytime in your device settings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 24, paddingTop: 60 },
  closeButton: { position: 'absolute', top: 60, right: 24 },
  closeText: { color: '#555', fontSize: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f5c518', textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 40 },
  features: { gap: 16, marginBottom: 40 },
  feature: { color: '#fff', fontSize: 16 },
  packages: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  package: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e' },
  packageSelected: { borderColor: '#f5c518', backgroundColor: '#2a2200' },
  packageTitle: { color: '#888', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  packageTitleSelected: { color: '#f5c518' },
  packagePrice: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  packagePriceSelected: { color: '#f5c518' },
  saveBadge: { marginTop: 6, backgroundColor: '#f5c518', color: '#0f0f0f', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  subscribeButton: { backgroundColor: '#f5c518', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  subscribeButtonDisabled: { opacity: 0.5 },
  subscribeText: { color: '#0f0f0f', fontWeight: 'bold', fontSize: 16 },
  restoreText: { color: '#555', textAlign: 'center', fontSize: 14, marginBottom: 24 },
  legal: { color: '#333', fontSize: 11, textAlign: 'center', lineHeight: 16 },
});