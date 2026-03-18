import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/data/colors';
import { FOODS, type FoodItem } from '@/data/foods';

type StatusFilter = 'all' | 'toxic' | 'avoid' | 'cook_temp' | 'caution' | 'safe';

const STATUS_CONFIG: Record<FoodItem['st'], { icon: string; label: string; color: string; bg: string; border: string }> = {
  toxic:     { icon: '🚫', label: 'Toxic',     color: colors.rose700,   bg: colors.rose50,   border: colors.rose200 },
  avoid:     { icon: '❌', label: 'Avoid',     color: colors.rose500,   bg: '#FFF1F1',       border: colors.rose200 },
  cook_temp: { icon: '🌡️', label: 'Cook Temp', color: colors.amber700,  bg: colors.amber50,  border: colors.amber200 },
  caution:   { icon: '⚠️', label: 'Caution',  color: colors.amber500,  bg: '#FFFBEB',       border: colors.amber200 },
  safe:      { icon: '✅', label: 'Safe',      color: colors.emerald700, bg: colors.emerald50, border: colors.emerald200 },
};

const FILTER_ORDER: StatusFilter[] = ['all', 'toxic', 'avoid', 'cook_temp', 'caution', 'safe'];
const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All', toxic: '🚫 Toxic', avoid: '❌ Avoid',
  cook_temp: '🌡️ Temp', caution: '⚠️ Caution', safe: '✅ Safe',
};

const STATUS_ORDER: Record<FoodItem['st'], number> = {
  toxic: 0, avoid: 1, cook_temp: 2, caution: 3, safe: 4,
};

export default function FoodGuideScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showKPlus, setShowKPlus] = useState(false);
  const [showPhos, setShowPhos] = useState(false);
  const [showSodium, setShowSodium] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FOODS
      .filter(f => {
        if (statusFilter !== 'all' && f.st !== statusFilter) return false;
        if (showKPlus && !f.k) return false;
        if (showPhos && !f.p) return false;
        if (showSodium && !f.s) return false;
        if (!q) return true;
        return (
          f.name.toLowerCase().includes(q) ||
          f.al.some(a => a.toLowerCase().includes(q)) ||
          f.cat.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => STATUS_ORDER[a.st] - STATUS_ORDER[b.st] || a.name.localeCompare(b.name));
  }, [query, statusFilter, showKPlus, showPhos, showSodium]);

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: FOODS.length };
    FOODS.forEach(f => { counts[f.st] = (counts[f.st] ?? 0) + 1; });
    return counts;
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Food Safety Guide</Text>
          <Text style={styles.subtitle}>{FOODS.length} foods checked for transplant safety</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods or aliases…"
          placeholderTextColor={colors.slate400}
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
          accessibilityLabel="Search foods"
        />
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTER_ORDER.map(f => (
          <Pressable
            key={f}
            style={[styles.filterChip, statusFilter === f ? styles.filterChipActive : null]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f ? styles.filterChipTextActive : null]}>
              {FILTER_LABELS[f]}
              {countsByStatus[f] ? ` (${countsByStatus[f]})` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Flag filters */}
      <View style={styles.flagRow}>
        <Text style={styles.flagLabel}>Show only:</Text>
        {[
          { label: 'K+', active: showKPlus, toggle: () => setShowKPlus(!showKPlus), color: colors.amber500 },
          { label: 'Phosphorus', active: showPhos, toggle: () => setShowPhos(!showPhos), color: colors.purple700 },
          { label: 'Sodium', active: showSodium, toggle: () => setShowSodium(!showSodium), color: colors.sky700 },
        ].map(flag => (
          <Pressable
            key={flag.label}
            style={[styles.flagChip, flag.active ? { backgroundColor: flag.color, borderColor: flag.color } : null]}
            onPress={flag.toggle}
          >
            <Text style={[styles.flagChipText, flag.active ? styles.flagChipTextActive : null]}>{flag.label}</Text>
          </Pressable>
        ))}
        <Text style={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Food list */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No foods match your search.</Text>
            <Text style={styles.emptyHint}>Try a different spelling or clear filters.</Text>
          </View>
        ) : null}

        {filtered.map(food => {
          const cfg = STATUS_CONFIG[food.st];
          const isExpanded = expandedItem === food.name;
          return (
            <Pressable
              key={food.name}
              style={[styles.foodCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
              onPress={() => setExpandedItem(isExpanded ? null : food.name)}
              accessibilityRole="button"
              accessibilityLabel={`${food.name}: ${cfg.label}`}
            >
              <View style={styles.foodRow}>
                <Text style={styles.foodIcon}>{cfg.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.foodNameRow}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color }]}>
                      <Text style={styles.statusBadgeText}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.foodCat}>{food.cat}</Text>
                </View>
                {/* Flags */}
                <View style={styles.flagsCol}>
                  {food.k ? <Text style={styles.flagPill}>K+</Text> : null}
                  {food.p ? <Text style={[styles.flagPill, { backgroundColor: colors.purple50, color: colors.purple700 }]}>Phos</Text> : null}
                  {food.s ? <Text style={[styles.flagPill, { backgroundColor: colors.sky50, color: colors.sky700 }]}>Na</Text> : null}
                </View>
                <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>▼</Text>
              </View>

              {isExpanded ? (
                <View style={styles.foodDetail}>
                  <Text style={styles.foodNote}>{food.note}</Text>
                  {food.temp ? (
                    <View style={styles.tempRow}>
                      <Text style={styles.tempIcon}>🌡️</Text>
                      <Text style={styles.tempText}>Cook to {food.temp}</Text>
                    </View>
                  ) : null}
                  {food.al.length > 0 ? (
                    <Text style={styles.aliases}>Also known as: {food.al.join(', ')}</Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This guide reflects general post-transplant dietary guidelines. Your transplant team may have specific instructions that override these recommendations. Always ask your coordinator before making dietary changes.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { fontSize: 15, color: colors.indigo500, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  searchInput: { height: 42, backgroundColor: colors.slate100, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: colors.slate800 },
  filterScroll: { backgroundColor: colors.white, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200 },
  filterChipActive: { backgroundColor: colors.indigo500, borderColor: colors.indigo500 },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  filterChipTextActive: { color: colors.white },
  flagRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100, gap: 8 },
  flagLabel: { fontSize: 11, fontWeight: '600', color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.5 },
  flagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1.5, borderColor: colors.slate300 },
  flagChipText: { fontSize: 11, fontWeight: '700', color: colors.slate600 },
  flagChipTextActive: { color: colors.white },
  resultCount: { marginLeft: 'auto', fontSize: 11, color: colors.slate400, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16 },
  foodCard: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 8 },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  foodIcon: { fontSize: 22, marginTop: 2 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  foodName: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  foodCat: { fontSize: 11, color: colors.slate500 },
  flagsCol: { flexDirection: 'column', gap: 3, alignItems: 'flex-end' },
  flagPill: { fontSize: 9, fontWeight: '700', backgroundColor: colors.amber50, color: colors.amber700, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  chevron: { fontSize: 10, color: colors.slate400, marginTop: 4 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  foodDetail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.slate200 },
  foodNote: { fontSize: 13, color: colors.slate700, lineHeight: 19, fontWeight: '500', marginBottom: 6 },
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tempIcon: { fontSize: 14 },
  tempText: { fontSize: 13, fontWeight: '700', color: colors.amber700 },
  aliases: { fontSize: 11, color: colors.slate400, fontStyle: 'italic', lineHeight: 17 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.slate600, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: colors.slate400 },
  disclaimer: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: colors.slate100 },
  disclaimerText: { fontSize: 11, color: colors.slate500, lineHeight: 17, textAlign: 'center' },
});
