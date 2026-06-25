import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { ORDER_LABELS, peso } from '@/lib/constants';
import { Card, ErrorText, Loader, Tag } from '@/components/ui';
import { colors, mono } from '@/theme/colors';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        if (active) setOrder(data.order);
      } catch (err) {
        if (active) setError(apiError(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (!order) return error ? <View style={{ padding: 20 }}><ErrorText>{error}</ErrorText></View> : <Loader />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Card style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{order.titleSnapshot}</Text>
        <Text style={{ color: colors.muted }}>
          {order.quantity} × {peso(order.unitPrice)} ·{' '}
          {order.fulfillment === 'shipping' ? 'Shipping' : 'Campus pickup'}
        </Text>
        <Tag label={ORDER_LABELS[order.status] || order.status} />
        <Text style={{ color: colors.copperBright, fontFamily: mono, fontSize: 20, fontWeight: '700' }}>
          {peso(order.amountReserved)}
        </Text>
      </Card>

      <Text style={{ color: colors.muted, fontWeight: '700', marginTop: 4 }}>Activity</Text>
      {(order.statusHistory ?? [])
        .slice()
        .reverse()
        .map((h: any, i: number) => (
          <View key={i} style={{ gap: 2 }}>
            <Text style={{ color: colors.text }}>{ORDER_LABELS[h.status] || h.status}</Text>
            <Text style={{ color: colors.textDim, fontSize: 12 }}>
              {h.note} · {new Date(h.at).toLocaleString()}
            </Text>
          </View>
        ))}
      <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 8 }}>
        Order actions (pay, cancel, dispute) coming in the next build.
      </Text>
    </ScrollView>
  );
}
