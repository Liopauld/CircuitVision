import { useCallback, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { availableActions, canDispute, ORDER_LABELS, peso } from '@/lib/constants';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Loader,
  Money,
  Muted,
  Screen,
  SectionHeader,
  StatusTag,
} from '@/components/ui';
import { colors, radius, space } from '@/theme/colors';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [disputeMsgs, setDisputeMsgs] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [showReason, setShowReason] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      if (data.order.status === 'disputed') {
        const d = await api.get(`/disputes/order/${id}`);
        setDispute(d.data.dispute);
        setDisputeMsgs(d.data.messages);
      }
    } catch (err) {
      setError(apiError(err));
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!order) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loader />;

  const viewerRole =
    user?.role === 'admin' ? 'admin' : order.buyerId?._id === user?.id ? 'buyer' : 'seller';
  const actions = availableActions(order, viewerRole);

  async function act(action: string) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/orders/${id}/actions`, { action });
      await refreshUser();
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitDispute() {
    if (!reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/disputes', { orderId: id, reason: reason.trim() });
      setReason('');
      setShowReason(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendDisputeMsg() {
    if (!msg.trim()) return;
    try {
      const { data } = await api.post(`/disputes/${dispute._id}/messages`, { body: msg.trim() });
      setDisputeMsgs((m) => [...m, data.message]);
      setMsg('');
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function messageOther() {
    const otherId = viewerRole === 'buyer' ? order.sellerId?._id : order.buyerId?._id;
    if (!otherId) return;
    try {
      const { data } = await api.post('/messages/conversations', {
        userId: otherId,
        listingId: order.listingId,
      });
      router.push(`/conversation/${data.conversationId}`);
    } catch (err) {
      setError(apiError(err));
    }
  }

  const closed = dispute && (dispute.status === 'resolved' || dispute.status === 'rejected');

  return (
    <Screen>
      <Card>
        <Body style={{ fontSize: 18, fontWeight: '800' }}>{order.titleSnapshot}</Body>
        <Muted>
          {order.quantity} × {peso(order.unitPrice)} ·{' '}
          {order.fulfillment === 'shipping' ? 'Shipping' : 'Campus pickup'}
        </Muted>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusTag status={order.status} label={ORDER_LABELS[order.status] || order.status} />
          <Money value={peso(order.amountReserved)} size={20} />
        </View>
      </Card>

      <ErrorText>{error}</ErrorText>

      {actions.map((a) => (
        <Button
          key={a.action}
          title={a.label}
          variant={a.kind === 'ghost' ? 'ghost' : 'primary'}
          onPress={() => act(a.action)}
          disabled={busy}
        />
      ))}

      {viewerRole !== 'admin' && (
        <Button title="💬 Message the other party" variant="ghost" onPress={messageOther} />
      )}

      {/* Raise dispute */}
      {viewerRole !== 'admin' && canDispute(order) && !showReason && (
        <Button title="⚠️ Raise a dispute" variant="danger" onPress={() => setShowReason(true)} />
      )}
      {showReason && (
        <Card>
          <Muted style={{ fontWeight: '600' }}>What went wrong?</Muted>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Describe the problem…"
            placeholderTextColor={colors.textDim}
            multiline
            style={{
              color: colors.text,
              backgroundColor: colors.bg2,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.sm,
              padding: 10,
              minHeight: 70,
              textAlignVertical: 'top',
            }}
          />
          <Button title="Submit dispute" variant="danger" onPress={submitDispute} disabled={busy} />
        </Card>
      )}

      {/* Dispute panel */}
      {order.status === 'disputed' && dispute && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Body style={{ fontWeight: '700' }}>Dispute</Body>
            <StatusTag status={dispute.status === 'rejected' ? 'cancelled' : dispute.status === 'resolved' ? 'completed' : 'disputed'} label={dispute.status} />
          </View>
          {closed && (
            <Muted>
              Outcome: {dispute.resolution}
              {dispute.refundAmount > 0 ? ` · ${peso(dispute.refundAmount)} refunded` : ''}
            </Muted>
          )}
          {disputeMsgs.map((m) => {
            const mine = (m.senderId?._id || m.senderId) === user?.id;
            return (
              <View
                key={m._id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: mine ? 'rgba(232,183,101,0.18)' : colors.surfaceHi,
                  borderColor: mine ? colors.borderHi : colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  borderCurve: 'continuous',
                  padding: 9,
                  gap: 2,
                }}>
                <Muted style={{ fontSize: 11 }}>
                  {m.senderId?.name || 'User'}
                  {m.senderId?.role === 'admin' ? ' · admin' : ''}
                </Muted>
                <Body style={{ fontSize: 14 }}>{m.body}</Body>
              </View>
            );
          })}
          {!closed && (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <TextInput
                value={msg}
                onChangeText={setMsg}
                placeholder="Write a message…"
                placeholderTextColor={colors.textDim}
                style={{
                  flex: 1,
                  color: colors.text,
                  backgroundColor: colors.bg2,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                }}
              />
              <Button title="Send" onPress={sendDisputeMsg} />
            </View>
          )}
        </Card>
      )}

      <SectionHeader>Activity</SectionHeader>
      {(order.statusHistory ?? [])
        .slice()
        .reverse()
        .map((h: any, i: number) => (
          <View key={i} style={{ gap: 2 }}>
            <Body style={{ fontWeight: '600' }}>{ORDER_LABELS[h.status] || h.status}</Body>
            <Muted style={{ fontSize: 12 }}>
              {h.note} · {new Date(h.at).toLocaleString()}
            </Muted>
          </View>
        ))}
    </Screen>
  );
}
