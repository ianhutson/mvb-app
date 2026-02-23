import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type ScanItem = {
  id: string;
  name: string;
  score: number | null;
};

type Scan = {
  id: string;
  captured_at: string;
  best: ScanItem | null;
  item_count: number;
};

type Restaurant = {
  id: string;
  name: string;
  scans: Scan[];
};

export default function HistoryScreen({ navigation }: any) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingScan, setRenamingScan] = useState<{ scanId: string; currentName: string } | null>(null);
  const [newName, setNewName] = useState('');

  async function fetchHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Delete restaurants with no scans
      const { data: emptyRestaurants } = await supabase
        .from('restaurants')
        .select('id, scans(id)')
        .eq('user_id', session.user.id);

      if (emptyRestaurants) {
        const emptyIds = emptyRestaurants
          .filter((r: any) => !r.scans || r.scans.length === 0)
          .map((r: any) => r.id);
        if (emptyIds.length > 0) {
          await supabase.from('restaurants').delete().in('id', emptyIds);
        }
      }

      // Fetch named restaurants with their scans
      const { data: namedData, error: namedErr } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          scans (
            id,
            captured_at,
            scan_items ( id, name, score )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (namedErr) throw namedErr;

      // Fetch orphan scans (no restaurant)
      const { data: orphanScans, error: orphanErr } = await supabase
        .from('scans')
        .select(`id, captured_at, scan_items ( id, name, score )`)
        .eq('user_id', session.user.id)
        .is('restaurant_id', null)
        .order('captured_at', { ascending: false });

      if (orphanErr) throw orphanErr;

      const shapeScan = (s: any) => {
        const items: ScanItem[] = s.scan_items ?? [];
        const sorted = [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
        return {
          id: s.id,
          captured_at: s.captured_at,
          best: sorted[0] ?? null,
          item_count: items.length,
        };
      };

      const shaped: Restaurant[] = (namedData ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        scans: (r.scans ?? [])
          .sort((a: any, b: any) =>
            new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
          )
          .map(shapeScan),
      }));

      // Add orphan scans as a virtual "Unnamed" group
      if (orphanScans && orphanScans.length > 0) {
        shaped.push({
          id: 'orphan',
          name: '',
          scans: orphanScans.map(shapeScan),
        });
      }

      setRestaurants(shaped);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Refresh when screen comes into focus (e.g. after a new scan)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchHistory();
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function deleteScan(scanId: string) {
    Alert.alert(
      'Delete scan?',
      'This will permanently delete this scan and all its items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('scan_items').delete().eq('scan_id', scanId);
              await supabase.from('scans').delete().eq('id', scanId);
              // Remove locally and clean up empty restaurants
              setRestaurants(prev =>
                prev
                  .map(r => ({ ...r, scans: r.scans.filter(s => s.id !== scanId) }))
                  .filter(r => r.scans.length > 0)
              );
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  function openRename(scanId: string, currentName: string) {
    setRenamingScan({ scanId, currentName });
    setNewName(currentName);
    setRenameModalVisible(true);
  }

  async function handleRename() {
    if (!newName.trim() || !renamingScan) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: restaurant, error: restErr } = await supabase
        .from('restaurants')
        .upsert(
          { user_id: session.user.id, name: newName.trim() },
          { onConflict: 'user_id,name' }
        )
        .select()
        .single();

      if (restErr) throw restErr;

      await supabase
        .from('scans')
        .update({ restaurant_id: restaurant.id })
        .eq('id', renamingScan.scanId);

      setRenameModalVisible(false);
      fetchHistory();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function renderScan(scan: Scan, restaurantName: string) {
    return (
      <View key={scan.id} style={styles.scanCard}>
        <TouchableOpacity
          style={styles.scanCardContent}
          onPress={() => navigation.navigate('ScanDetail', { scanId: scan.id, restaurantName })}
        >
          <View style={styles.scanHeader}>
            <Text style={styles.scanDate}>{formatDate(scan.captured_at)}</Text>
            <Text style={styles.scanCount}>{scan.item_count} beers</Text>
          </View>
          {scan.best && (
            <View style={styles.bestRow}>
              <Text style={styles.bestLabel}>🏆 Best</Text>
              <Text style={styles.bestName} numberOfLines={1}>{scan.best.name}</Text>
              {scan.best.score && (
                <Text style={styles.bestScore}>{scan.best.score.toFixed(2)}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteScan(scan.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderRestaurant({ item }: { item: Restaurant }) {
    const isOrphan = item.id === 'orphan';
    return (
      <View style={styles.restaurantSection}>
        <View style={styles.restaurantHeader}>
          <View>
            <Text style={[styles.restaurantName, isOrphan && styles.unnamedLabel]}>
              {isOrphan ? 'Unnamed' : item.name}
            </Text>
            <Text style={styles.scanCountLabel}>
              {item.scans.length} {item.scans.length === 1 ? 'scan' : 'scans'}
            </Text>
          </View>
          {!isOrphan && (
            <TouchableOpacity
              style={styles.renameRestaurantButton}
              onPress={() => openRename(item.scans[0]?.id, item.name)}
            >
              <Text style={styles.renameRestaurantText}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
        {item.scans.map((scan) => renderScan(scan, isOrphan ? '' : item.name))}
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
        <Text style={styles.errorText}>Failed to load history</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🍺</Text>
        <Text style={styles.emptyTitle}>No scans yet</Text>
        <Text style={styles.emptySubtitle}>Scan a menu to see your history here</Text>
        <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.scanButtonText}>Scan a Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={renderRestaurant}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f5c518"
          />
        }
      />

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rename</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Bar or restaurant name"
              placeholderTextColor="#555"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleRename}
              >
                <Text style={styles.modalSaveText}>Save</Text>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  list: {
    gap: 32,
    paddingBottom: 40,
  },
  restaurantSection: {
    gap: 8,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  unnamedLabel: {
    color: '#555',
    fontStyle: 'italic',
  },
  scanCountLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  scanCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scanCardContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanDate: {
    color: '#888',
    fontSize: 13,
  },
  scanCount: {
    color: '#555',
    fontSize: 13,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bestLabel: {
    fontSize: 13,
  },
  bestName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  bestScore: {
    color: '#f5c518',
    fontSize: 13,
    fontWeight: 'bold',
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
  retryButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: '#f5c518',
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  scanButtonText: {
    color: '#0f0f0f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#2a2a2a',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  renameRestaurantButton: {
    padding: 4,
  },
  renameRestaurantText: {
    fontSize: 16,
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
    borderRadius: 12,
    padding: 24,
    width: '100%',
    gap: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
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