import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, apiError } from '@/lib/api';
import { CATEGORIES, SORT_OPTIONS } from '@/lib/constants';
import { ListingCard, type Listing } from '@/components/listing-card';
import { ErrorText, Loader } from '@/components/ui';
import { colors, mono, radius } from '@/theme/colors';

export default function Browse() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<string>('newest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchListings = useCallback(async (cat: string, sortBy: string) => {
    setError('');
    try {
      const params: Record<string, string> = {};
      if (cat) params.category = cat;
      if (sortBy) params.sort = sortBy;
      const { data } = await api.get('/listings', { params });
      setListings(data.listings);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(category, sort);
  }, [category, sort, fetchListings]);

  function pick(cat: string) {
    setCategory((c) => (c === cat ? '' : cat));
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={(l) => l._id}
      numColumns={2}
      style={{ backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="automatic"
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 14 }}
      contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.copperBright}
          onRefresh={() => {
            setRefreshing(true);
            fetchListings(category, sort);
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ padding: 14, gap: 12 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.copperBright, fontFamily: mono, fontSize: 11, letterSpacing: 1.5 }}>
              ⚡ ESP32 · RASPBERRY PI · ARDUINO
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
              Buy & sell, student to student.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[{ value: '', label: 'All' }, ...CATEGORIES].map((c) => {
              const active = category === c.value;
              return (
                <Pressable
                  key={c.value || 'all'}
                  onPress={() => pick(c.value)}
                  style={{
                    borderColor: active ? colors.copperBright : colors.border,
                    backgroundColor: active ? colors.copperBright : 'transparent',
                    borderWidth: 1,
                    borderRadius: radius.pill,
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                  }}>
                  <Text style={{ color: active ? '#1c1205' : colors.muted, fontWeight: '600', fontSize: 13 }}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map((s) => {
              const active = sort === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSort(s.value)}
                  style={{
                    borderColor: active ? colors.copperBright : colors.border,
                    borderWidth: 1,
                    borderRadius: radius.pill,
                    paddingVertical: 5,
                    paddingHorizontal: 11,
                  }}>
                  <Text
                    style={{
                      color: active ? colors.copperBright : colors.muted,
                      fontSize: 12,
                      fontFamily: mono,
                    }}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ErrorText>{error}</ErrorText>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Loader />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🔌</Text>
            <Text style={{ color: colors.muted }}>No components found.</Text>
          </View>
        )
      }
      renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
    />
  );
}
