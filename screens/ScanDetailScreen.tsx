import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useVolumeUnit, formatVolume, VolumeUnit } from '../lib/useVolumeUnit';

type BeerItem = {
  id: string;
  name: string;
  volume_ml: number | null;
  abv: number | null;
  price: number | null;
  score: number | null;
};

export default function ScanDetailScreen({ route, navigation }: any) {
  const { scanId, restaurantName: initialName } = route.params;
  const [items, setItems] = useState<BeerItem[]>([]);
  const [capturedAt, setCapturedAt] = useState('');
  const [restaurantName, setRestaurantName] = useState<string>(initialName ?? '');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const userDefault = useVolumeUnit();
  const [scanUnit, setScanUnit] = useState<VolumeUnit | null>(null);
  const volumeUnit: VolumeUnit = scanUnit ?? userDefault;

  useEffect(() => {
    async function fetchScan() {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select(`
            captured_at,
            restaurant_id,
            volume_unit,
            restaurants ( id, name ),
            scan_items (
              id, name, volume_ml, abv, price, score
            )
          `)
          .eq('id', scanId)
          .single();

        if (error) throw error;

        setCapturedAt(data.captured_at);
        if (data.volume_unit) setScanUnit(data.volume_unit as VolumeUnit);
        const rname = (data.restaurants as any)?.name ?? '';
        setRestaurantName(rname);
        setRestaurantId((data.restaurants as any)?.id ?? null);
        setNewName(rname);

        const sorted = [...(data.scan_items ?? [])].sort(
          (a, b) => (b.score ?? -1) - (a.score ?? -1)
        );
        setItems(sorted);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchScan();
  }, [scanId]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function handleRename() {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a name.');
      return;
    }
    setSaving(true);
    try {
      if (restaurantId) {
        // Update existing restaurant name
        const { error } = await supabase
          .from('restaurants')
          .update({ name: newName.trim() })
          .eq('id', restaurantId);
        if (error) throw error;
      } else {
        // Create new restaurant and link to scan
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not logged in');

        const { data: restaurant, error: restErr } = await supabase
          .from('restaurants')
          .upsert(
            { user_id: session.user.id, name: newName.trim() },
            { onConflict: 'user_id,name' }
          )
          .select()
          .single();
        if (restErr) throw restErr;

        const { error: scanErr } = await supabase
          .from('scans')
          .update({ restaurant_id: restaurant.id })
          .eq('id', scanId);
        if (scanErr) throw scanErr;

        setRestaurantId(restaurant.id);
      }

      setRestaurantName(newName.trim());
      setRenameModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleScanUnit() {
    const next: VolumeUnit = volumeUnit === 'floz' ? 'ml' : 'floz';
    setScanUnit(next);
    await supabase.from('scans').update({ volume_unit: next }).eq('id', scanId);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f5c518" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load scan</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = restaurantName || 'Unsaved';
  const isUnsaved = !restaurantName;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isUnsaved && styles.unsavedTitle]}>{displayName}</Text>
          <TouchableOpacity
            style={styles.renameButton}
            onPress={() => {
              setNewName(restaurantName);
              setRenameModalVisible(true);
            }}
          >
            <Text style={styles.renameButtonText}>✏️ Rename</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.subtitleRow}>
          {capturedAt && (
            <Text style={styles.subtitle}>{formatDate(capturedAt)} · {items.length} beers</Text>
          )}
          <TouchableOpacity style={styles.unitToggle} onPress={toggleScanUnit}>
            <Text style={[styles.unitOption, volumeUnit === 'floz' && styles.unitOptionActive]}>fl oz</Text>
            <Text style={styles.unitDivider}>/</Text>
            <Text style={[styles.unitOption, volumeUnit === 'ml' && styles.unitOptionActive]}>mL</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {isUnsaved ? 'Name this scan' : 'Rename'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. The Tap Room"
              placeholderTextColor="#555"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleRename}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#0f0f0f" />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
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
  centered: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  back: {
    marginBottom: 16,
  },
  backButton: {
    marginTop: 16,
  },
  backButtonText: {
    color: '#555',
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  unsavedTitle: {
    color: '#555',
    fontStyle: 'italic',
  },
  renameButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  renameButtonText: {
    color: '#888',
    fontSize: 13,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    flex: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorDetail: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
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
  modalInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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