import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { api, apiError } from '@/lib/api';
import { ListingCard, type Listing } from '@/components/listing-card';
import { ErrorText, Loader } from '@/components/ui';
import { useFavorites } from '@/context/favorites';
import { colors } from '@/theme/colors';

export default function Saved() {
  const { ids } = useFavorites();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/users/me/favorites');
      setListings(data.listings);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when the favourite set changes (e.g. un-hearting from this screen).
  useEffect(() => {
    load();
  }, [load, ids]);

  return (
    <FlatList
      data={listings}
      keyExtractor={(l) => l._id}
      numColumns={2}
      style={{ backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="automatic"
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 14 }}
      contentContainerStyle={{ gap: 12, paddingVertical: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.copperBright}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListHeaderComponent={error ? <ErrorText>{error}</ErrorText> : null}
      ListEmptyComponent={
        loading ? (
          <Loader />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>♡</Text>
            <Text style={{ color: colors.muted }}>No saved items yet.</Text>
          </View>
        )
      }
      renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
    />
  );
}
