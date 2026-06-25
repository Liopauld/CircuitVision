import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { peso, TX_META } from '@/lib/constants';
import {
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  Field,
  Money,
  Muted,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, space } from '@/theme/colors';

const QUICK = [200, 500, 1000];

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [txns, setTxns] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/wallet/transactions');
      setTxns(data.transactions);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function topUp() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/wallet/topup', { amount: amt });
      setAmount('');
      await refreshUser();
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.copperBright}
          onRefresh={() => { setRefreshing(true); load(); }}
        />
      }>
      <Card style={{ alignItems: 'center', gap: space.xs }}>
        <Muted>Available balance</Muted>
        <Money value={peso(user?.walletBalance ?? 0)} size={38} />
        {!!user?.reservedBalance && (
          <Muted>{peso(user.reservedBalance)} reserved in active orders</Muted>
        )}
      </Card>

      <Card>
        <Body style={{ fontWeight: '700' }}>Top up (mock)</Body>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {QUICK.map((q) => (
            <Pressable
              key={q}
              onPress={() => setAmount(String(q))}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 9,
                borderRadius: radius.sm,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Body style={{ color: colors.copperBright }}>{peso(q)}</Body>
            </Pressable>
          ))}
        </View>
        <Field
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="0"
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Add funds" onPress={topUp} loading={busy} disabled={!amount} />
      </Card>

      <SectionHeader>Activity</SectionHeader>
      {txns.length === 0 ? (
        <Empty glyph="🧾" text="No wallet activity yet." />
      ) : (
        txns.map((tx) => {
          const meta = TX_META[tx.type] || { sign: '', label: tx.type };
          const positive = meta.sign === '+';
          return (
            <View
              key={tx._id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '600' }}>{meta.label}</Body>
                <Muted style={{ fontSize: 12 }}>
                  {tx.description} · {new Date(tx.createdAt).toLocaleDateString()}
                </Muted>
              </View>
              <Body style={{ color: positive ? colors.green : colors.muted, fontWeight: '700' }}>
                {meta.sign}
                {peso(tx.amount)}
              </Body>
            </View>
          );
        })
      )}
    </Screen>
  );
}
