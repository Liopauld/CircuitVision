import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, apiError } from '@/lib/api';
import { categoryLabel } from '@/lib/constants';
import { ListingCard, type Listing } from '@/components/listing-card';
import { Button, Card, ErrorText, Loader } from '@/components/ui';
import { colors, mono } from '@/theme/colors';

const CAT_ICON: Record<string, string> = { esp32: '📡', raspi: '🍓', arduino: '🔌' };
const NULL_LABELS = ['null', 'none', 'background', 'unknown', 'nothing'];
const isNullClass = (l?: string | null) => !!l && NULL_LABELS.includes(String(l).toLowerCase());

type ScanResult = {
  enabled?: boolean;
  suggestedCategory?: string | null;
  confidence?: number;
  label?: string | null;
  error?: string;
};

export default function Scan() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Listing[]>([]);

  const cat = result?.suggestedCategory || null;
  const pct = result ? Math.round((result.confidence || 0) * 100) : 0;

  // Recommend top listings in the detected category (ranked by seller rating).
  useEffect(() => {
    if (!cat) {
      setMatches([]);
      return;
    }
    let active = true;
    api
      .get('/listings', { params: { category: cat, limit: 24, sort: 'views' } })
      .then(({ data }) => {
        if (!active) return;
        const ranked = [...data.listings]
          .sort((a: Listing, b: Listing) => (b.sellerId?.ratingAvg || 0) - (a.sellerId?.ratingAvg || 0))
          .slice(0, 6);
        setMatches(ranked);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cat]);

  async function scanUri(uri: string) {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      // React Native file part — RN sets the multipart boundary itself.
      fd.append('image', { uri, name: 'scan.jpg', type: 'image/jpeg' } as unknown as Blob);
      const { data } = await api.post('/scan', fd);
      setResult(data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function pick(source: 'camera' | 'library') {
    setError('');
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setError('Camera permission denied.');
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (!r.canceled && r.assets?.[0]) await scanUri(r.assets[0].uri);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return setError('Photos permission denied.');
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (!r.canceled && r.assets?.[0]) await scanUri(r.assets[0].uri);
      }
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.copperBright, fontFamily: mono, fontSize: 11, letterSpacing: 1.5 }}>
          ⚡ AR VISION
        </Text>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Component scanner</Text>
        <Text style={{ color: colors.muted }}>Identify a board from a photo and find it on CircuitVision.</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="📷 Take photo" onPress={() => pick('camera')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="🖼️ Library" variant="ghost" onPress={() => pick('library')} />
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      {busy && <Loader />}

      {result && !busy && (
        <Card
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderColor: cat ? colors.copperBright : colors.border,
          }}>
          <Text style={{ fontSize: 30 }}>{cat ? CAT_ICON[cat] : '🤔'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              {cat ? categoryLabel(cat) : result.error ? 'Scan failed' : isNullClass(result.label) ? 'No board detected' : 'Not recognized'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {cat
                ? `${pct}% match`
                : result.error || (result.label ? `Closest: ${result.label} (${pct}%)` : 'Not an ESP32 / Pi / Arduino')}
            </Text>
          </View>
          {cat ? (
            <Text style={{ color: colors.copperBright, fontFamily: mono, fontWeight: '700', fontSize: 16 }}>{pct}%</Text>
          ) : null}
        </Card>
      )}

      {matches.length > 0 && cat && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            {CAT_ICON[cat]} Top {categoryLabel(cat)} matches
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {matches.map((l, i) => (
              <View key={l._id} style={{ width: '47%' }}>
                <ListingCard listing={l} index={i} />
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
