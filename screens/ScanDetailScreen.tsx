import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

type BeerItem = {
  id: string;
  name: string;
  volume_ml: number | null;
  abv: number | null;
  price: number | null;
  score: number | null;
};

export default function ScanDetailScreen({ route, navigation }: any) {
  const { scanId, restaurantName } = route.params;
  const [items, setItems] = useState<BeerItem[]>([]);
  const [capturedAt, setCapturedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchScan() {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select(`
            captured_at,
            scan_items (
              id, name, volume_ml, abv, price, score
            )
          `)
          .eq('id', scanId)
          .single();

        if (error) throw error;

        setCapturedAt(data.captured_at);
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

  function renderItem({ item, index }: { item: BeerItem; index: number }) {
    const isBest = index === 0;
    return (
      <View style={[styles.card, isBest && styles.bestCard]}>
        {isBest && <Text style={styles.bestBadge}>🏆 Best Value</Text>}
        <Text style={[styles.beerName, isBest && styles.bestBeerName]}>{item.name}</Text>
        <View style={styles.details}>
          {item.volume_ml && <Text style={styles.detail}>{item.volume_ml}ml</Text>}
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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{restaurantName}</Text>
      {capturedAt && (
        <Text style={styles.subtitle}>{formatDate(capturedAt)} · {items.length} beers</Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
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
});