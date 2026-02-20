import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

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
  const best: BeerItem | null = data.best ?? null;
  const restaurant = data.restaurant?.name ?? 'This Bar';

  function renderItem({ item, index }: { item: BeerItem; index: number }) {
    const isBest = index === 0;
    return (
      <View style={[styles.card, isBest && styles.bestCard]}>
        {isBest && <Text style={styles.bestBadge}>🏆 Best Value</Text>}
        <Text style={[styles.beerName, isBest && styles.bestBeerName]}>{item.name}</Text>
        <View style={styles.details}>
          {item.volume_ml && (
            <Text style={styles.detail}>{item.volume_ml}ml</Text>
          )}
          {item.abv && (
            <Text style={styles.detail}>{item.abv}% ABV</Text>
          )}
          {item.price && (
            <Text style={styles.detail}>${item.price}</Text>
          )}
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
      <Text style={styles.title}>{restaurant}</Text>
      <Text style={styles.subtitle}>{items.length} beers ranked by value</Text>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.buttonText}>Scan Another Menu</Text>
      </TouchableOpacity>
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
    paddingBottom: 24,
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
  button: {
    backgroundColor: '#f5c518',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#0f0f0f',
    fontWeight: 'bold',
    fontSize: 16,
  },
});