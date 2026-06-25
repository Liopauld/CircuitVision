import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { apiError } from '@/lib/api';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors, radius } from '@/theme/colors';

const ROLES = [
  { value: 'customer', label: 'Buy components' },
  { value: 'seller', label: 'Sell components' },
] as const;

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '' });
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await register({ ...form, email: form.email.trim(), role });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 22, gap: 16 }}>
        <Field label="Name" value={form.name} onChangeText={set('name')} placeholder="Juan dela Cruz" />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@school.test"
        />
        <Field
          label="Student ID (optional)"
          value={form.studentId}
          onChangeText={set('studentId')}
          placeholder="2021-00123"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
          placeholder="At least 6 characters"
        />

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>I want to</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={{
                    flex: 1,
                    borderColor: active ? colors.copperBright : colors.border,
                    borderWidth: 1,
                    backgroundColor: active ? 'rgba(232, 183, 101, 0.12)' : 'transparent',
                    borderRadius: radius.sm,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: active ? colors.copperBright : colors.muted, fontWeight: '600' }}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ErrorText>{error}</ErrorText>

        <Button
          title="Create account"
          onPress={submit}
          loading={busy}
          disabled={!form.name || !form.email || !form.password}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
