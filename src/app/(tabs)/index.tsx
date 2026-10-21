import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { House3D } from '@/components/House3D';
import { Screen, T } from '@/components/ui';
import { allTasks, greet, greeting, shopItems } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const { status, user } = useAuth();
  const name = status === 'account' ? displayName(user) : null;
  const all = allTasks(S, now);
  const late = all.filter(x => x.s.k === 'late').length;
  const today = all.filter(x => x.s.k === 'today').length;
  const shop = shopItems(S).length;
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });
  const toToday = () => router.navigate('/bugun');

  return (
    <Screen>
      <View>
        <T v="h1">{greet(new Date(now), name)}</T>
        <T v="lead">
          {late + today ? `Bugün ${late + today} iş var. ${greeting(new Date(now)).line}` : `Bugün her şey yolunda ✨ ${greeting(new Date(now)).line}`}
        </T>
      </View>

      <View style={styles.tiles}>
        <Tile emoji="⏰" n={late} label="gecikti" bg={c.lateSoft} fg={c.late} onPress={toToday} />
        <Tile emoji="☀️" n={today} label="bugün" bg={c.todaySoft} fg={c.today} onPress={toToday} />
        <Tile emoji="🛒" n={shop} label="alınacak" bg={c.okSoft} fg={c.ok} onPress={toToday} />
      </View>

      <House3D state={S} onOpenRoom={open} now={now} />
      <T v="small" style={{ textAlign: 'center', marginTop: -8, fontSize: 14 }}>Bir odaya dokun, işlerini gör.</T>
    </Screen>
  );
}

function Tile({ emoji, n, label, bg, fg, onPress }: { emoji: string; n: number; label: string; bg: string; fg: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && { transform: [{ translateY: 2 }] }]}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, color: fg }}>{n}</Text>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: fg }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.card, gap: 2 },
});
