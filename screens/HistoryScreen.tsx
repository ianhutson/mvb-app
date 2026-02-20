import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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

  async function fetchHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch restaurants with their scans and best item per scan
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          scans (
            id,
            captured_at,
            scan_items (
              id,
              name,
              score
            )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Shape the data
      const shaped: Restaurant[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        scans: (r.scans ?? [])
          .sort((a: any, b: any) =>
            new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
          )
          .map((s: any) => {
            const items: ScanItem[] = s.scan_items ?? [];
            const sorted = [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
            return {
              id: s.id,
              captured_at: s.captured_at,
              best: sorted[0] ?? null,
              item_count: items.length,
            };
          }),
      }));

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

  function renderScan(scan: Scan, restaurantName: string) {
    return (
      <TouchableOpacity
        key={scan.id}
        style={styles.scanCard}
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
    );
  }

  function renderRestaurant({ item }: { item: Restaurant }) {
    return (
      <View style={styles.restaurantSection}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.scanCountLabel}>
          {item.scans.length} {item.scans.length === 1 ? 'scan' : 'scans'}
        </Text>
        {item.scans.map((scan) => renderScan(scan, item.name))}
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
  scanCountLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  scanCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
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
});