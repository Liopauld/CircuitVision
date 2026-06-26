import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useFavorites } from '@/context/favorites';
import { peso } from '@/lib/constants';
import { Button, Card } from '@/components/ui';
import { colors, mono } from '@/theme/colors';

export default function Profile() {
  const { user, logout } = useAuth();
  const { count } = useFavorites();
  const router = useRouter();
  if (!user) return null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{user.name}</Text>
        <Text style={{ color: colors.muted }}>{user.email}</Text>
        <Text style={{ color: colors.copperBright, fontFamily: mono, textTransform: 'uppercase', fontSize: 12 }}>
          {user.role}
        </Text>
      </Card>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Wallet balance</Text>
        <Text style={{ color: colors.text, fontFamily: mono, fontSize: 18, fontWeight: '700' }}>
          {peso(user.walletBalance)}
        </Text>
      </Card>

      <Button
        title={count > 0 ? `♥ Saved items (${count})` : '♡ Saved items'}
        variant="ghost"
        onPress={() => router.push('/saved')}
      />

      <View style={{ marginTop: 8 }}>
        <Button title="Sign out" variant="danger" onPress={logout} />
      </View>
    </ScrollView>
  );
}
