import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';

export default function Orders() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
      <Text style={{ fontSize: 40 }}>📦</Text>
      <Text style={{ color: colors.muted, textAlign: 'center' }}>
        Your orders will appear here. (Coming in the next build.)
      </Text>
    </View>
  );
}
