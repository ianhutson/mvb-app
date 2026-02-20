import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useVolumeUnit, formatVolume, VolumeUnit } from '../lib/useVolumeUnit';

type BeerItem = {
  name: string;
  volume_ml: number | null;
  abv: number | null;
  price: number | null;
  score: number | null;
};

export default function ResultsScreen({ route, navigation }: any) {
  const { data } = route.params;
  const items: BeerItem[] = data.items ?? [];
  const scanId: string = data.scan?.id ?? null;

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const userDefault = useVolumeUnit();
  const [scanUnit, setScanUnit] = useState<VolumeUnit | null>(null);
  const volumeUnit: VolumeUnit = scanUnit ?? userDefault;

  async function toggleScanUnit() {
    const next: VolumeUnit = volumeUnit === 'floz' ? 'ml' : 'floz';
    setScanUnit(next);
    if (scanId) {
      await supabase.from('scans').update({ volume_unit: next }).eq('id', scanId);
    }
  }

  async function handleSave() {
    if (!restaurantName.trim()) {
      Alert.alert('Name required', 'Please enter the bar or restaurant name.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Not logged in');
        return;
      }

      // Upsert restaurant and link scan
      const { data: restaurant, error: restErr } = await supabase
        .from('restaurants')
        .upsert(
          { user_id: session.user.id, name: restaurantName.trim() },
          { onConflict: 'user_id,name' }
        )
        .select()
        .single();

      if (restErr) throw restErr;

      if (scanId) {
        await supabase
          .from('scans')
          .update({ restaurant_id: restaurant.id })
          .eq('id', scanId);
      }

      setSaveModalVisible(false);
      setSaved(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function renderItem({ item, index }: { item: BeerItem; index: number }) {
    const isBest = index === 0;
    return (
      <View style={[styles.card, isBest && styles.bestCard]}>
        {isBest && <Text style={styles.bestBadge}>🏆 Best Value</Text>}
        <Text style={[styles.beerName, isBest && styles.bestBeerName]}>{item.name}</Text>
        <View style={styles.details}>
          {item.volume_ml && <Text style={styles.detail}>{formatVolume(item.volume_ml, volumeUnit)}</Text>}
          {item.abv && <Text style={styles.detail}>{item.abv}% ABV</Text>}
          {item.price && <Text style={styles.detail}>${item.price}</Text>}
        </View>
        {item.score && (
          <Text style={[styles.score, isBest && styles.bestScore]}>
            Score: {item.score.toFixed(2)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Tabs')}>
          <Text style={styles.topNavButton}>← Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.topNavButtonAccent}>Scan Again</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Results</Text>
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>{items.length} beers ranked by value</Text>
        <TouchableOpacity style={styles.unitToggle} onPress={toggleScanUnit}>
          <Text style={[styles.unitOption, volumeUnit === 'floz' && styles.unitOptionActive]}>fl oz</Text>
          <Text style={styles.unitDivider}>/</Text>
          <Text style={[styles.unitOption, volumeUnit === 'ml' && styles.unitOptionActive]}>mL</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.actions}>
            {!saved ? (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setSaveModalVisible(true)}
              >
                <Text style={styles.saveButtonText}>🏷️  Name this Scan</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>✓ Named</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Save Modal */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Name this Scan</Text>
            <Text style={styles.modalSubtitle}>What's this bar or restaurant called?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. The Tap Room"
              placeholderTextColor="#555"
              value={restaurantName}
              onChangeText={setRestaurantName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSaveModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0f0f0f" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
  },
  unitOption: {
    color: '#555',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unitOptionActive: {
    color: '#f5c518',
  },
  unitDivider: {
    color: '#333',
    fontSize: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
  },
  bestCard: {
    backgroundColor: '#2a2200',
    borderWidth: 1,
    borderColor: '#f5c518',
  },
  bestBadge: {
    color: '#f5c518',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  beerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  bestBeerName: {
    color: '#f5c518',
  },
  details: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  detail: {
    color: '#888',
    fontSize: 14,
  },
  score: {
    color: '#555',
    fontSize: 13,
  },
  bestScore: {
    color: '#f5c518',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#f5c518',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0f0f0f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  savedBadge: {
    backgroundColor: '#1a2e1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d6a2d',
  },
  savedBadgeText: {
    color: '#4caf50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanAgainButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  scanAgainText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topNavButton: {
    color: '#555',
    fontSize: 14,
  },
  topNavButtonAccent: {
    color: '#f5c518',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontWeight: 'bold',
  },
  modalSave: {
    flex: 1,
    backgroundColor: '#f5c518',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#0f0f0f',
    fontWeight: 'bold',
  },
});