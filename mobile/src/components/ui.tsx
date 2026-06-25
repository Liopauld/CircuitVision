import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow, space, statusColor } from '@/theme/colors';

// Standard scrollable screen body: automatic safe-area insets + consistent
// padding, so every screen lines up the same way (per the Expo UI guidelines).
export function Screen({
  children,
  refreshControl,
  contentStyle,
}: {
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewProps['style'];
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      refreshControl={refreshControl}
      contentContainerStyle={[{ padding: space.lg, gap: space.lg }, contentStyle]}>
      {children}
    </ScrollView>
  );
}

// ---- Typography ----
export function Title(props: TextProps) {
  return <Text {...props} style={[{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }, props.style]} />;
}
export function Heading(props: TextProps) {
  return <Text {...props} style={[{ color: colors.text, fontSize: 16, fontWeight: '700' }, props.style]} />;
}
export function Body(props: TextProps) {
  return <Text {...props} style={[{ color: colors.text, fontSize: 15, lineHeight: 21 }, props.style]} />;
}
export function Muted(props: TextProps) {
  return <Text {...props} style={[{ color: colors.muted, fontSize: 13 }, props.style]} />;
}
export function Money({ value, size = 16 }: { value: string; size?: number }) {
  return (
    <Text selectable style={{ color: colors.copperBright, fontSize: size, fontWeight: '700' }}>
      {value}
    </Text>
  );
}

export function SectionHeader({ children }: { children: ReactNode }) {
  // Copper-trace divider routing out of the heading — the Rev.A signature.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm }}>
      <Heading>{children}</Heading>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.solder,
          borderWidth: 1,
          borderColor: colors.copper,
        }}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === 'primary' ? colors.copperBright : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'ghost' ? colors.text : variant === 'danger' ? '#fff' : '#1c1205';
  return (
    <Pressable
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: variant === 'ghost' ? colors.borderHi : 'transparent',
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderRadius: radius.sm,
        borderCurve: 'continuous',
        paddingVertical: 13,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          padding: space.lg,
          gap: space.md,
          ...shadow,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Tag({ label, color = colors.copperBright }: { label: string; color?: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderColor: color,
        borderWidth: 1,
        borderRadius: radius.pill,
        borderCurve: 'continuous',
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

export function StatusTag({ status, label }: { status: string; label?: string }) {
  return <Tag label={label || status} color={statusColor[status] || colors.copperBright} />;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <Muted style={{ fontWeight: '600' }}>{label}</Muted>
      <TextInput
        placeholderTextColor={colors.textDim}
        {...props}
        style={{
          color: colors.text,
          backgroundColor: colors.bg2,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.sm,
          borderCurve: 'continuous',
          paddingHorizontal: 12,
          paddingVertical: 11,
          fontSize: 15,
        }}
      />
    </View>
  );
}

export function Loader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <ActivityIndicator color={colors.copperBright} size="large" />
    </View>
  );
}

export function Empty({ glyph, text }: { glyph: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, gap: space.sm }}>
      <Text style={{ fontSize: 40 }}>{glyph}</Text>
      <Muted style={{ textAlign: 'center' }}>{text}</Muted>
    </View>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <View
      style={{
        backgroundColor: 'rgba(197, 26, 74, 0.14)',
        borderColor: 'rgba(197, 26, 74, 0.4)',
        borderWidth: 1,
        borderRadius: radius.sm,
        borderCurve: 'continuous',
        padding: 10,
      }}>
      <Text selectable style={{ color: colors.danger }}>
        {children}
      </Text>
    </View>
  );
}
