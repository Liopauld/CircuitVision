import { View, Text } from 'react-native';
import { useAuth } from '@/context/auth';
import { peso } from '@/lib/constants';
import { colors, mono } from '@/theme/colors';

export default function Wallet() {
  const { user } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
      <Text style={{ color: colors.muted }}>Wallet balance</Text>
      <Text style={{ color: colors.copperBright, fontFamily: mono, fontSize: 40, fontWeight: '800' }}>
        {peso(user?.walletBalance ?? 0)}
      </Text>
      <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 8 }}>
        Top-up & transactions coming in the next build.
      </Text>
    </View>
  );
}
