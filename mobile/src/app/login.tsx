import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { apiError } from '@/lib/api';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors, mono } from '@/theme/colors';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      // RootNavigator redirects on auth state change.
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 18, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={{ color: colors.copperBright, fontFamily: mono, fontSize: 12, letterSpacing: 2 }}>
              ⚡ COMPONENT MARKETPLACE
            </Text>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>
              CircuitVision
            </Text>
            <Text style={{ color: colors.muted }}>Sign in to buy and sell components.</Text>
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@school.test"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <ErrorText>{error}</ErrorText>

          <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />

          <Link href="/register" style={{ color: colors.copperBright, textAlign: 'center' }}>
            No account? Create one
          </Link>

          <Text style={{ color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Demo: customer@circuitvision.test · Password123
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
