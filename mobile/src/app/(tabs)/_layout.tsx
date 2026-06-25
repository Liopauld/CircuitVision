import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/colors';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.bg2, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.copperBright,
        tabBarInactiveTintColor: colors.muted,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Browse', tabBarIcon: ({ color }) => <Icon glyph="⚡" color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <Icon glyph="📦" color={color} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: 'Wallet', tabBarIcon: ({ color }) => <Icon glyph="💳" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color }) => <Icon glyph="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon glyph="👤" color={color} /> }}
      />
    </Tabs>
  );
}
