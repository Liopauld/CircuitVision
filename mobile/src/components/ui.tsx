import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { colors, radius } from '@/theme/colors';

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
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: variant === 'ghost' ? colors.borderHi : 'transparent',
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderRadius: radius.sm,
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
          padding: 14,
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
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        {...props}
        style={{
          color: colors.text,
          backgroundColor: colors.bg2,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.sm,
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

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <View
      style={{
        backgroundColor: 'rgba(197, 26, 74, 0.14)',
        borderColor: 'rgba(197, 26, 74, 0.4)',
        borderWidth: 1,
        borderRadius: radius.sm,
        padding: 10,
      }}>
      <Text style={{ color: colors.danger }}>{children}</Text>
    </View>
  );
}
