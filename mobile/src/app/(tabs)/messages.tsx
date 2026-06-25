import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';

export default function Messages() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
      <Text style={{ fontSize: 40 }}>💬</Text>
      <Text style={{ color: colors.muted, textAlign: 'center' }}>
        Buyer/seller messaging coming in the next build.
      </Text>
    </View>
  );
}
