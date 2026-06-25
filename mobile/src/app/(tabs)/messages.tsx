import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { Body, Card, Empty, ErrorText, Loader, Muted, Screen } from '@/components/ui';
import { colors, radius, space } from '@/theme/colors';

export default function Messages() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/messages/conversations');
      setRows(data.conversations);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.copperBright}
          onRefresh={() => { setRefreshing(true); load(); }}
        />
      }>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty glyph="💬" text="No conversations yet. Message a seller from a listing." />
      ) : (
        rows.map((c) => (
          <Link key={c.id} href={`/conversation/${c.id}`} asChild>
            <Pressable>
              <Card style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Body style={{ fontWeight: '700' }}>{c.other?.name || 'User'}</Body>
                  {c.unread > 0 && (
                    <View
                      style={{
                        minWidth: 20,
                        height: 20,
                        paddingHorizontal: 6,
                        borderRadius: 10,
                        backgroundColor: colors.copperBright,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Body style={{ color: '#1c1205', fontSize: 12, fontWeight: '800' }}>{c.unread}</Body>
                    </View>
                  )}
                </View>
                {!!c.listingTitle && <Muted style={{ color: colors.copperBright }}>{c.listingTitle}</Muted>}
                <Muted numberOfLines={1}>{c.lastMessage || 'No messages yet'}</Muted>
              </Card>
            </Pressable>
          </Link>
        ))
      )}
    </Screen>
  );
}
