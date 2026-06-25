import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { Body, Button, ErrorText, Loader, Muted } from '@/components/ui';
import { colors, radius, space } from '@/theme/colors';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [convo, setConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/conversations/${id}`);
      setConvo(data.conversation);
      setMessages(data.messages);
    } catch (err) {
      setError(apiError(err));
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBody('');
    try {
      const { data } = await api.post(`/messages/conversations/${id}`, { body: text });
      setMessages((m) => [...m, data.message]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setError(apiError(err));
    }
  }

  if (!convo) return error ? <View style={{ padding: space.lg }}><ErrorText>{error}</ErrorText></View> : <Loader />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen options={{ title: convo.other?.name || 'Conversation' }} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m._id}
        contentContainerStyle={{ padding: space.lg, gap: space.sm }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          convo.listingTitle ? (
            <Muted style={{ textAlign: 'center', color: colors.copperBright, marginBottom: space.sm }}>
              Re: {convo.listingTitle}
            </Muted>
          ) : null
        }
        renderItem={({ item }) => {
          const mine = (item.senderId?._id || item.senderId) === user?.id;
          return (
            <View
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: mine ? 'rgba(232,183,101,0.18)' : colors.surfaceHi,
                borderColor: mine ? colors.borderHi : colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}>
              <Body style={{ fontSize: 14 }}>{item.body}</Body>
            </View>
          );
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          padding: space.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message…"
          placeholderTextColor={colors.textDim}
          style={{
            flex: 1,
            color: colors.text,
            backgroundColor: colors.bg2,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.sm,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <Button title="Send" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
