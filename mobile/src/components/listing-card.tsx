import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { peso } from '@/lib/constants';
import { colors, mono, radius } from '@/theme/colors';
import { useAuth } from '@/context/auth';
import { useFavorites } from '@/context/favorites';

export type Listing = {
  _id: string;
  title: string;
  price: number;
  category: string;
  status: string;
  condition?: string;
  quantity?: number;
  cloudinaryUrl?: string[];
  soldCount?: number;
  sellerId?: { _id?: string; name?: string; ratingAvg?: number; ratingCount?: number };
};

const CAT_COLOR: Record<string, string> = {
  esp32: colors.esp32,
  raspi: colors.raspi,
  arduino: colors.arduino,
};

const PLACEHOLDER = 'https://placehold.co/600x450/0a1a13/e8b765?text=No+Image';

export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const uri = listing.cloudinaryUrl?.[0] || PLACEHOLDER;
  const refdes = `U${index + 1}`;
  const catColor = CAT_COLOR[listing.category] || colors.copperBright;
  const faved = isFavorite(listing._id);
  const rating = listing.sellerId?.ratingCount ? listing.sellerId.ratingAvg : null;

  return (
    <Link href={`/listing/${listing._id}`} asChild>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          overflow: 'hidden',
        }}>
        <View>
          <Image
            source={{ uri }}
            style={{ width: '100%', aspectRatio: 4 / 3 }}
            contentFit="cover"
            transition={200}
          />
          {/* Rev.A signature: reference designator + solder pads */}
          <Text
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              color: colors.solder,
              fontFamily: mono,
              fontSize: 10,
              fontWeight: '700',
            }}>
            {refdes}
          </Text>
          <View style={[padStyle, { bottom: 8, left: 8 }]} />
          <View style={[padStyle, { bottom: 8, right: 8 }]} />
          {user ? (
            <Pressable
              onPress={() => toggle(listing._id)}
              hitSlop={8}
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(7,18,13,0.7)',
                borderWidth: 1,
                borderColor: faved ? '#ff5d73' : colors.border,
              }}>
              <Text style={{ color: faved ? '#ff5d73' : '#fff', fontSize: 15 }}>
                {faved ? '♥' : '♡'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ padding: 10, gap: 4 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
            {listing.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontFamily: mono, fontWeight: '700' }}>
              {peso(listing.price)}
            </Text>
            <Text style={{ color: catColor, fontSize: 11, fontFamily: mono }}>{listing.status}</Text>
          </View>
          {rating ? (
            <Text style={{ color: colors.muted, fontSize: 11 }}>⭐ {rating}</Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const padStyle = {
  position: 'absolute' as const,
  width: 7,
  height: 7,
  borderRadius: 4,
  backgroundColor: colors.solder,
  borderColor: colors.copper,
  borderWidth: 1,
  opacity: 0.7,
};
