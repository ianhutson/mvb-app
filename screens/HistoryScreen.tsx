import React, { useState, useCallback } from 'react';
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
  name: string | null;
  captured_at: string;
  best: ScanItem | null;
  item_count: number;
};

export default function HistoryScreen({ navigation }: any) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingScan, setRenamingScan] = useState<Scan | null>(null);
  const [newName, setNewName] = useState('');

  async function fetchHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: allRestaurants } = await supabase
        .from('restaurants')
        .select('id, scans(id)')
        .eq('user_id', session.user.id);

      if (allRestaurants) {
        const emptyIds = allRestaurants
          .filter((r: any) => !r.scans || r.scans.length === 0)
          .map((r: any) => r.id);
        if (emptyIds.length > 0) {
          await supabase.from('restaurants').delete().in('id', emptyIds);
        }
      }

      const { data, error } = await supabase
        .from('scans')
        .select('id, captured_at, restaurants ( name ), scan_items ( id, name, score )')
        .eq('user_id', session.user.id)
        .order('captured_at', { ascending: false });

      if (error) throw error;

      const shaped: Scan[] = (data ?? []).map((s: any) => {
        const items: ScanItem[] = s.scan_items ?? [];
        const sorted = [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
        return {
          id: s.id,
          name: s.restaurants?.name ?? null,
          captured_at: s.captured_at,
          best: sorted[0] ?? null,
          item_count: items.length,
        };
      });

      setScans(shaped);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

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

  function openRename(scan: Scan) {
    setRenamingScan(scan);
    setNewName(scan.name ?? '');
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
        .eq('id', renamingScan.id);

      setRenameModalVisible(false);
      fetchHistory();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function deleteScan(scanId: string) {
    Alert.alert('Delete scan?', 'This will permanently delete this scan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('scan_items').delete().eq('scan_id', scanId);
            await supabase.from('scans').delete().eq('id', scanId);
            setScans(prev => prev.filter(s => s.id !== scanId));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  function renderScan({ item }: { item: Scan }) {
    const isNamed = !!item.name;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate('ScanDetail', { scanId: item.id, restaurantName: item.name ?? '' })}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.scanName, !isNamed && styles.unnamedText]} numberOfLines={1}>
              {isNamed ? item.name : 'Unnamed'}
            </Text>
            <TouchableOpacity style={styles.renameButton} onPress={(e) => { e.stopPropagation(); openRename(item); }}>
              <Text style={styles.renameText}>✏️</Text>
            </TouchableOpacity>
          </View>
         <Text style={styles.scanDate}>{formatDate(item.captured_at)}</Text>
          {item.best && (
            <View style={styles.bestRow}>
              <Text style={styles.bestLabel}>🏆 Best</Text>
              <Text style={styles.bestName} numberOfLines={1}>{item.best.name}</Text>
              {item.best.score && (
                <Text style={styles.bestScore}>{item.best.score.toFixed(2)}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteScan(item.id)}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#f5c518" /></View>;

  if (error) return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Failed to load history</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (scans.length === 0) return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>🍺</Text>
      <Text style={styles.emptyTitle}>No scans yet</Text>
      <Text style={styles.emptySubtitle}>Scan a menu to see your history here</Text>
      <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.scanButtonText}>Scan a Menu</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        renderItem={renderScan}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f5c518" />}
      />
      <Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Name this scan</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Bar or restaurant name"
              placeholderTextColor="#555"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRenameModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleRename}>
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
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 24, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  list: { gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 12, flexDirection: 'row', alignItems: 'stretch' },
  cardContent: { flex: 1, padding: 16, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanName: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 1 },
  unnamedText: { color: '#555', fontStyle: 'italic', fontWeight: 'normal' },
  renameButton: { padding: 2 },
  renameText: { fontSize: 14 },
  scanDate: { color: '#555', fontSize: 13 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bestLabel: { fontSize: 13 },
  bestName: { color: '#fff', fontSize: 14, flex: 1 },
  bestScore: { color: '#f5c518', fontSize: 13, fontWeight: 'bold' },
  deleteButton: { paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#2a2a2a' },
  deleteButtonText: { fontSize: 18 },
  errorText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  retryButton: { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 12, paddingHorizontal: 24, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptySubtitle: { color: '#555', fontSize: 14, textAlign: 'center' },
  scanButton: { backgroundColor: '#f5c518', borderRadius: 8, padding: 14, paddingHorizontal: 28, marginTop: 8 },
  scanButtonText: { color: '#0f0f0f', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 24, width: '100%', gap: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalInput: { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 8, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#888', fontWeight: 'bold' },
  modalSave: { flex: 1, backgroundColor: '#f5c518', borderRadius: 8, padding: 14, alignItems: 'center' },
  modalSaveText: { color: '#0f0f0f', fontWeight: 'bold' },
});