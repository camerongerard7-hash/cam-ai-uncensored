import { useState } from 'react';
import { SafeAreaView, View, TextInput, Button, FlatList, Text } from 'react-native';
import { API_URL } from '../lib/config';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);

  const send = async () => {
    if (!input.trim()) return;
    const next = [...messages, { role: 'user', content: input } as Msg];
    setMessages(next);
    const sending = input;
    setInput('');

    const r = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: 'ios-user', message: sending }),
    });
    const data = await r.json();
    setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'No reply' }]);
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: '700' }}>{item.role}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Say something..."
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 8 }}
      />
      <Button title="Send" onPress={send} />
    </SafeAreaView>
  );
}
