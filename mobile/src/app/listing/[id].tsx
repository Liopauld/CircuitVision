import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { categoryLabel, peso } from '@/lib/constants';
import { Button, Card, ErrorText, Loader, Tag } from '@/components/ui';
import { colors, mono, radius } from '@/theme/colors';

const PLACEHOLDER = 'https://placehold.co/600x450/0a1a13/e8b765?text=No+Image';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'shipping'>('pickup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/listings/${id}`);
        if (active) setListing(data.listing);
      } catch (err) {
        if (active) setError(apiError(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function buy() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/orders', { listingId: id, quantity: qty, fulfillment });
      await refreshUser();
      router.replace(`/order/${data.order._id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!listing) return error ? <View style={{ padding: 20 }}><ErrorText>{error}</ErrorText></View> : <Loader />;

  const isOwner = user && listing.sellerId?._id === user.id;
  const isAdmin = user?.role === 'admin';
  const canBuy = listing.status === 'available' && !isOwner && !isAdmin;
  const total = listing.price * qty;
  const uri = listing.cloudinaryUrl?.[0] || PLACEHOLDER;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: categoryLabel(listing.category) }} />
      <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="cover" />

      <View style={{ padding: 18, gap: 12 }}>
        <Tag label={categoryLabel(listing.category)} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{listing.title}</Text>
        <Text style={{ color: colors.copperBright, fontFamily: mono, fontSize: 26, fontWeight: '700' }}>
          {peso(listing.price)}
        </Text>
        <Text style={{ color: colors.muted }}>
          {listing.status} · {listing.condition} · {listing.quantity} in stock
          {listing.sellerId?.name ? ` · Sold by ${listing.sellerId.name}` : ''}
        </Text>

        {!!listing.description && (
          <Text style={{ color: colors.text, lineHeight: 21, marginTop: 4 }}>{listing.description}</Text>
        )}

        {listing.specs && Object.keys(listing.specs).length > 0 && (
          <Card style={{ gap: 8 }}>
            {Object.entries(listing.specs).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.muted }}>{k}</Text>
                <Text style={{ color: colors.text, fontFamily: mono }}>{String(v)}</Text>
              </View>
            ))}
          </Card>
        )}

        <ErrorText>{error}</ErrorText>

        {canBuy ? (
          <Card style={{ gap: 14, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.muted }}>Quantity</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Stepper label="−" onPress={() => setQty((q) => Math.max(1, q - 1))} />
                <Text style={{ color: colors.text, fontFamily: mono, fontSize: 18, minWidth: 24, textAlign: 'center' }}>
                  {qty}
                </Text>
                <Stepper label="+" onPress={() => setQty((q) => Math.min(listing.quantity, q + 1))} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['pickup', 'shipping'] as const).map((f) => {
                const active = fulfillment === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFulfillment(f)}
                    style={{
                      flex: 1,
                      borderColor: active ? colors.copperBright : colors.border,
                      backgroundColor: active ? 'rgba(232,183,101,0.12)' : 'transparent',
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      paddingVertical: 10,
                      alignItems: 'center',
                    }}>
                    <Text style={{ color: active ? colors.copperBright : colors.muted, fontWeight: '600' }}>
                      {f === 'pickup' ? 'Campus pickup' : 'Shipping'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>Total (held from wallet)</Text>
              <Text style={{ color: colors.copperBright, fontFamily: mono, fontWeight: '700', fontSize: 16 }}>
                {peso(total)}
              </Text>
            </View>

            <Button title={busy ? 'Placing order…' : 'Buy now'} onPress={buy} loading={busy} />
            {user && (
              <Text style={{ color: colors.textDim, fontSize: 12, textAlign: 'center' }}>
                Wallet balance: {peso(user.walletBalance)}
              </Text>
            )}
          </Card>
        ) : (
          <Text style={{ color: colors.muted, marginTop: 8 }}>
            {isOwner
              ? 'This is your listing.'
              : isAdmin
                ? 'Admins manage listings rather than purchase them.'
                : 'This item is not currently available.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: radius.sm,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: colors.text, fontSize: 20 }}>{label}</Text>
    </Pressable>
  );
}
