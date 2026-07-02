import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/data/colors';
import { FOODS, type FoodItem } from '@/data/foods';
import Card from '@/components/Card';

const STATUS_CONFIG: Record<
  FoodItem['st'],
  { label: string; bg: string; text: string; border: string }
> = {
  toxic: { label: 'PROHIBITED', bg: colors.rose50, text: colors.rose700, border: colors.rose200 },
  avoid: { label: 'AVOID', bg: '#FFF7ED', text: colors.orange700, border: '#FED7AA' },
  cook_temp: { label: 'COOK PROPERLY', bg: colors.amber50, text: colors.amber700, border: colors.amber200 },
  caution: { label: 'LIMIT', bg: colors.yellow50, text: colors.yellow700, border: '#FDE68A' },
  safe: { label: 'SAFE', bg: colors.emerald50, text: colors.emerald700, border: colors.emerald200 },
};

const CATS = ['All', 'Fruit', 'Protein', 'Vegetable', 'Dairy', 'Beverage', 'Grain', 'Other'];

export default function FoodsScreen() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FOODS.filter((f) => {
      if (cat !== 'All' && f.cat !== cat) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.al.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [search, cat]);

  const grouped = useMemo(() => {
    const order: FoodItem['st'][] = ['toxic', 'avoid', 'cook_temp', 'caution', 'safe'];
    const map = new Map<FoodItem['st'], FoodItem[]>();
    for (const st of order) map.set(st, []);
    for (const f of filtered) {
      map.get(f.st)!.push(f);
    }
    return order.filter((st) => map.get(st)!.length > 0).map((st) => ({
      status: st,
      items: map.get(st)!,
    }));
  }, [filtered]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Food Safety Guide',
          headerLargeTitle: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search foods..."
          placeholderTextColor={colors.slate400}
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 16 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {CATS.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, cat === c && styles.chipActive]}
              onPress={() => setCat(c)}
            >
              <Text style={[styles.chipText, cat === c && styles.chipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {grouped.map(({ status, items }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <View key={status} style={{ marginBottom: 20 }}>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
              {items.map((food) => (
                <Card key={food.name}>
                  <View style={styles.foodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodNote}>{food.note}</Text>
                      {food.temp ? (
                        <Text style={styles.foodTemp}>Cook to {food.temp}</Text>
                      ) : null}
                    </View>
                    <View style={styles.flags}>
                      {food.k ? <Text style={styles.flag}>K+</Text> : null}
                      {food.p ? <Text style={styles.flag}>P+</Text> : null}
                      {food.s ? <Text style={styles.flag}>Na+</Text> : null}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          );
        })}

        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No foods match your search</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingTop: 12 },
  search: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    fontSize: 15,
    color: colors.slate800,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  chipActive: {
    backgroundColor: colors.indigo50,
    borderColor: colors.indigo500,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.slate500 },
  chipTextActive: { color: colors.indigo600 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  foodName: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 3 },
  foodNote: { fontSize: 13, color: colors.slate600, lineHeight: 18 },
  foodTemp: { fontSize: 12, fontWeight: '600', color: colors.amber700, marginTop: 4 },
  flags: { flexDirection: 'row', gap: 4, paddingTop: 2 },
  flag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.amber700,
    backgroundColor: colors.amber50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: colors.slate400 },
});
