import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api, apiError } from '@/lib/api';
import { categoryLabel } from '@/lib/constants';
import { ListingCard, type Listing } from '@/components/listing-card';
import { Button, Card, ErrorText, Loader } from '@/components/ui';
import { colors, mono, radius } from '@/theme/colors';

const CAT_ICON: Record<string, string> = { esp32: '📡', raspi: '🍓', arduino: '🔌' };
const NULL_LABELS = ['null', 'none', 'background', 'unknown', 'nothing'];
const isNullClass = (l?: string | null) => !!l && NULL_LABELS.includes(String(l).toLowerCase());
const LIVE_MS = 1200; // sample cadence for the live camera (server round-trip bound)

type ScanResult = {
  enabled?: boolean;
  suggestedCategory?: string | null;
  confidence?: number;
  label?: string | null;
  error?: string;
};

export default function Scan() {
  const [mode, setMode] = useState<'upload' | 'live'>('upload');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [smooth, setSmooth] = useState<{ category: string; votes: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Listing[]>([]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const inFlight = useRef(false);
  const historyRef = useRef<(string | null)[]>([]);

  const cat = mode === 'live' ? smooth?.category || null : result?.suggestedCategory || null;
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

  async function postScan(uri: string): Promise<ScanResult> {
    const fd = new FormData();
    // React Native file part — RN sets the multipart boundary itself.
    fd.append('image', { uri, name: 'scan.jpg', type: 'image/jpeg' } as unknown as Blob);
    const { data } = await api.post('/scan', fd);
    return data;
  }

  // Upload mode: pick/take one photo and show a single verdict.
  async function scanUri(uri: string) {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await postScan(uri));
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

  // Live mode: majority-vote smoothing over recent frames so it doesn't flicker.
  function recordPrediction(data: ScanResult) {
    setResult(data);
    const h = historyRef.current;
    h.push(data.suggestedCategory || null);
    if (h.length > 6) h.shift();
    const counts: Record<string, number> = {};
    for (const c of h) if (c) counts[c] = (counts[c] || 0) + 1;
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    setSmooth(top ? { category: top, votes: counts[top], total: h.length } : null);
  }

  async function sampleFrame() {
    if (inFlight.current || !cameraRef.current) return;
    inFlight.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        shutterSound: false,
        skipProcessing: true,
      });
      if (photo?.uri) recordPrediction(await postScan(photo.uri));
    } catch {
      /* transient frame error — ignore */
    } finally {
      inFlight.current = false;
    }
  }

  // Drive the live sampler while in live mode with permission granted.
  useEffect(() => {
    if (mode !== 'live' || !permission?.granted) return undefined;
    setResult(null);
    setSmooth(null);
    historyRef.current = [];
    const timer = setInterval(sampleFrame, LIVE_MS);
    return () => clearInterval(timer);
  }, [mode, permission?.granted]);

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
        <Text style={{ color: colors.muted }}>Identify a board from a photo or live camera, and find it on CircuitVision.</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['upload', 'live'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? colors.copperBright : colors.border,
                backgroundColor: active ? 'rgba(201,138,58,0.14)' : 'transparent',
              }}>
              <Text style={{ color: active ? colors.copperBright : colors.muted, fontWeight: '700' }}>
                {m === 'upload' ? '📷 Upload' : '🎥 Live camera'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText>{error}</ErrorText>

      {mode === 'upload' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="📷 Take photo" onPress={() => pick('camera')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="🖼️ Library" variant="ghost" onPress={() => pick('library')} />
            </View>
          </View>
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
        </>
      ) : !permission ? (
        <Loader />
      ) : !permission.granted ? (
        <Card style={{ gap: 12, alignItems: 'flex-start' }}>
          <Text style={{ color: colors.text }}>Camera access is needed for live scanning.</Text>
          <Button title="Grant camera access" onPress={requestPermission} />
        </Card>
      ) : (
        <View
          style={{
            position: 'relative',
            aspectRatio: 3 / 4,
            borderRadius: radius.md,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.borderHi,
            backgroundColor: '#000',
          }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          <View
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 12,
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: 'rgba(7,18,13,0.72)',
              borderWidth: 1.5,
              borderColor: smooth ? colors.copperBright : colors.borderHi,
            }}>
            {smooth ? (
              <>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
                  {CAT_ICON[smooth.category]} {categoryLabel(smooth.category)}
                </Text>
                <Text style={{ color: colors.muted, fontFamily: mono, fontSize: 12 }}>
                  {pct}% · {smooth.votes}/{smooth.total} frames
                </Text>
              </>
            ) : (
              <Text style={{ color: colors.muted, fontFamily: mono, fontSize: 12 }}>
                {result?.error ? result.error : 'Point at a board…'}
              </Text>
            )}
          </View>
        </View>
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
