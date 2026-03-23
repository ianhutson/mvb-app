import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import Purchases from 'react-native-purchases';
import { useProStatus } from '../lib/useProStatus';

export default function ProfileScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<'ml' | 'floz'>('floz');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isPro } = useProStatus();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? '');

      const { data } = await supabase
        .from('profiles')
        .select('volume_unit')
        .eq('id', session.user.id)
        .single();

      if (data?.volume_unit) setVolumeUnit(data.volume_unit as 'ml' | 'floz');
      setLoading(false);
    }
    load();
  }, []);

  async function saveVolumeUnit(unit: 'ml' | 'floz') {
    setVolumeUnit(unit);
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').upsert({ id: session.user.id, volume_unit: unit });
    setSaving(false);
  }

  async function handleRestorePurchases() {
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active['pro']) {
        Alert.alert('Restored!', 'Your pro subscription has been restored.');
      } else {
        Alert.alert('No subscription found', 'No active subscription was found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This will permanently delete your account and all your scan history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete My Account', style: 'destructive', onPress: deleteAccount },
      ]
    );
  }

  async function deleteAccount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      const { data: scans } = await supabase.from('scans').select('id').eq('user_id', userId);
      if (scans && scans.length > 0) {
        await supabase.from('scan_items').delete().in('scan_id', scans.map(s => s.id));
      }
      await supabase.from('scans').delete().eq('user_id', userId);
      await supabase.from('restaurants').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
      Alert.alert('Account deleted', 'Your data has been removed.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f5c518" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Plan</Text>
          <Text style={[styles.rowValue, isPro && styles.proText]}>
            {isPro ? '✨ MVB Pro' : 'Free'}
          </Text>
        </View>
      </View>

      {!isPro && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation.navigate('Paywall')}>
            <Text style={styles.upgradeText}>✨  Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Display Preference</Text>
        <Text style={styles.sectionSubtitle}>Choose how volume is shown on scans</Text>
        <View style={styles.unitSelector}>
          <TouchableOpacity
            style={[styles.unitOption, volumeUnit === 'ml' && styles.unitOptionActive]}
            onPress={() => saveVolumeUnit('ml')}
          >
            <Text style={[styles.unitOptionText, volumeUnit === 'ml' && styles.unitOptionTextActive]}>mL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitOption, volumeUnit === 'floz' && styles.unitOptionActive]}
            onPress={() => saveVolumeUnit('floz')}
          >
            <Text style={[styles.unitOptionText, volumeUnit === 'floz' && styles.unitOptionTextActive]}>fl oz</Text>
          </TouchableOpacity>
        </View>
        {saving && <Text style={styles.savingText}>Saving...</Text>}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Danger Zone</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteAccount}>
          <Text style={styles.deleteButtonText}>Delete My Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 24, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 32 },
  section: { marginBottom: 32, gap: 8 },
  sectionLabel: { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sectionSubtitle: { color: '#555', fontSize: 13, marginBottom: 4 },
  row: { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#888', fontSize: 15 },
  rowValue: { color: '#fff', fontSize: 15 },
  proText: { color: '#f5c518', fontWeight: 'bold' },
  upgradeButton: { backgroundColor: '#f5c518', borderRadius: 8, padding: 16, alignItems: 'center' },
  upgradeText: { color: '#0f0f0f', fontWeight: 'bold', fontSize: 16 },
  unitSelector: { flexDirection: 'row', backgroundColor: '#1e1e1e', borderRadius: 8, padding: 4, gap: 4 },
  unitOption: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center' },
  unitOptionActive: { backgroundColor: '#f5c518' },
  unitOptionText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  unitOptionTextActive: { color: '#0f0f0f' },
  savingText: { color: '#555', fontSize: 12, textAlign: 'center' },
  signOutButton: { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 16, alignItems: 'center' },
  signOutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  restoreButton: { alignItems: 'center', padding: 12 },
  restoreText: { color: '#555', fontSize: 14 },
  deleteButton: { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#5c1a1a' },
  deleteButtonText: { color: '#e05555', fontWeight: 'bold', fontSize: 16 },
});