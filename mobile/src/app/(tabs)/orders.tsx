import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { ORDER_LABELS, peso } from '@/lib/constants';
import { Body, Card, Empty, ErrorText, Loader, Money, Muted, Screen, StatusTag } from '@/components/ui';
import { colors, radius, space } from '@/theme/colors';

const PLACEHOLDER = 'https://placehold.co/120x90/0a1a13/e8b765?text=—';

export default function Orders() {
  const { user } = useAuth();
  const canSell = user?.role === 'seller' || user?.role === 'admin';
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (r: 'buyer' | 'seller') => {
    setError('');
    try {
      const { data } = await api.get('/orders', { params: { role: r } });
      setOrders(data.orders);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(role); }, [load, role]));

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.copperBright}
          onRefresh={() => { setRefreshing(true); load(role); }}
        />
      }>
      {canSell && (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['buyer', 'seller'] as const).map((r) => {
            const active = role === r;
            return (
              <Pressable
                key={r}
                onPress={() => { setRole(r); setLoading(true); }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: radius.sm,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: active ? colors.copperBright : colors.border,
                  backgroundColor: active ? 'rgba(232,183,101,0.12)' : 'transparent',
                }}>
                <Body style={{ color: active ? colors.copperBright : colors.muted, fontWeight: '700' }}>
                  {r === 'buyer' ? 'Buying' : 'Selling'}
                </Body>
              </Pressable>
            );
          })}
        </View>
      )}

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <Loader />
      ) : orders.length === 0 ? (
        <Empty glyph="📦" text={`No ${role === 'buyer' ? 'purchases' : 'sales'} yet.`} />
      ) : (
        orders.map((o) => (
          <Link key={o._id} href={`/order/${o._id}`} asChild>
            <Pressable>
              <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <Image
                  source={{ uri: o.imageSnapshot || PLACEHOLDER }}
                  style={{ width: 56, height: 56, borderRadius: radius.sm }}
                  contentFit="cover"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Body numberOfLines={1} style={{ fontWeight: '700' }}>{o.titleSnapshot}</Body>
                  <Muted>
                    {role === 'buyer' ? o.sellerId?.name : o.buyerId?.name} · {o.quantity} ×{' '}
                    {peso(o.unitPrice)}
                  </Muted>
                  <StatusTag status={o.status} label={ORDER_LABELS[o.status] || o.status} />
                </View>
                <Money value={peso(o.amountReserved)} />
              </Card>
            </Pressable>
          </Link>
        ))
      )}
    </Screen>
  );
}
