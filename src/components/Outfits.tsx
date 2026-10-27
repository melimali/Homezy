import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { att, attLine, fitLabel, judgeBest, OCC, OCCASIONS, season, SEASON_NAME, suggest, type Look, type Occasion } from '@/domain/style';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

import { Btn, Card, Chip, EmptyMsg, Pill, SecHead, Swatch, T, XBtn } from './ui';

/** Son fotoğraf taramasında onaylanan parçalar (gardıroptaki kimlikleriyle). */
export type PhotoLook = { ids: string[]; worn: boolean; note: string };

/**
 * Kombin önerileri (prototipteki kombinHTML). Dolaptaki temiz parçalardan kurallarla öneri yapar,
 * yapay zekâ kullanmaz. Fotoğraf tarandıysa önce fotoğraftaki kombini değerlendirir, sonra o parçaları
 * dolaptaki başka parçalarla eşleştirir. Bir parçanın adına dokununca da o parçayla öneri yapar.
 */
export function Outfits({ rid, look, anchor, onClear }: { rid: string; look: PhotoLook | null; anchor: string[]; onClear: () => void }) {
  const c = useColors();
  const { state } = useStore();
  const now = useNow();
  const wardrobe = useMemo(() => state.mod[rid]?.wardrobe || [], [state.mod, rid]);
  const [occ, setOcc] = useState<Occasion>('gunluk');
  const [page, setPage] = useState(0);

  const ids = new Set(wardrobe.map(x => x.id));
  const anchors = anchor.filter(id => ids.has(id));
  const fromPhoto = !!look && anchors.length > 0 && anchors.join() === look.ids.filter(id => ids.has(id)).join();
  const sea = season(now);
  const anchorKey = anchors.join(',');
  const skipWorn = fromPhoto && !!look?.worn;
  // Öneri yüzlerce kombini puanlar; sadece dolap, ortam, seçim ya da mevsim değişince yeniden hesaplanır.
  const list = useMemo(
    () => suggest(wardrobe, occ, anchorKey ? anchorKey.split(',') : [], skipWorn, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wardrobe, occ, anchorKey, skipWorn, sea],
  );
  const pages = Math.max(1, Math.ceil(list.length / 3));
  const shown = list.slice((page % pages) * 3, (page % pages) * 3 + 3);
  const an = new Set(anchors);
  const anNames = anchors.map(id => wardrobe.find(x => x.id === id)!.name);

  // Üzerindeki kombin: en çok uyduğu ortama göre değerlendirilir, aşağıdaki ortam seçiminden bağımsız.
  let worn: (Look & { occ: Occasion }) | null = null;
  if (fromPhoto && look.worn) {
    const ps = look.ids.flatMap(id => wardrobe.filter(x => x.id === id)).map(att).filter(p => p.slot);
    if (ps.length >= 2) worn = judgeBest(ps, now);
  }
  const photoOnly = fromPhoto && !worn && look;

  return (
    <Card style={{ backgroundColor: c.fashionSurface, borderColor: c.fashionLine }}>
      <SecHead title="Kombin önerileri" right={SEASON_NAME[sea]} />
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Nereye giyeceksin?">
        {OCCASIONS.map(k => <Chip key={k} on={k === occ} label={OCC[k].label} onPress={() => { setOcc(k); setPage(0); }} />)}
      </View>
      {anchors.length > 0 ? (
        <View style={[styles.anchor, { backgroundColor: c.fashion, borderColor: c.fashionLine }]}>
          <T v="small" style={{ flex: 1 }}>{fromPhoto ? 'Fotoğraftaki parçalarla' : 'Şu parçayla'}: {anNames.join(', ')}</T>
          <XBtn label="Seçimi kaldır" onPress={() => { onClear(); setPage(0); }} />
        </View>
      ) : (
        <T v="tiny">Gardıroptaki bir parçanın adına dokun, o parçayla kombin önereyim.</T>
      )}

      {worn && (
        <View style={[styles.box, { backgroundColor: c.fashion, borderColor: c.fashionLine }]}>
          <SecHead h="h3" title="Fotoğraftaki kombin" right={<Pill k={fitLabel(worn.score)[0]} label={fitLabel(worn.score)[1]} />} />
          {!!look?.note && <T style={{ fontSize: 14 }}>{look.note}</T>}
          <Reasons why={[...worn.why.filter(x => x.d > 0).slice(0, 2), ...worn.why.filter(x => x.d < 0).slice(0, 2)]} />
          <T v="tiny">{OCC[worn.occ].label} bir gün için en uygun. Aşağıda bu parçaları dolabındaki başka parçalarla eşleştirdim.</T>
        </View>
      )}
      {photoOnly && !!look.note && (
        <View style={[styles.box, { backgroundColor: c.fashion, borderColor: c.fashionLine }]}>
          <T style={{ fontSize: 14 }}>{look.note}</T>
        </View>
      )}

      {shown.length ? (
        shown.map((o, i) => <LookCard key={(page % pages) * 3 + i} o={o} an={an} tag={fromPhoto ? 'fotoğraftan' : 'seçtiğin'} />)
      ) : (
        <EmptyMsg>
          {anchors.length
            ? 'Bu parçayla iyi duran bir kombin bulamadım. Başka bir ortam seç ya da dolabına parça ekle.'
            : 'Öneri için dolapta en az bir temiz üst, alt ve ayakkabı gerek.'}
        </EmptyMsg>
      )}
      {pages > 1 && <Btn small kind="ghost" label={`Başka öneriler ${(page % pages) + 1}/${pages}`} onPress={() => setPage(p => p + 1)} style={{ alignSelf: 'flex-start' }} />}
      <T v="tiny">Sadece temiz parçalardan öneririm. Renk uyumuna, açık-koyu kontrastına, kumaşların birbirine ve mevsime uyumuna bakarım.</T>
    </Card>
  );
}

function LookCard({ o, an, tag }: { o: Look; an: Set<string>; tag: string }) {
  const c = useColors();
  const [k, label] = fitLabel(o.score);
  return (
    <View style={[styles.box, { backgroundColor: c.surface2 }]}>
      <View style={{ alignSelf: 'flex-start' }}><Pill k={k} label={label} /></View>
      {o.ps.map(p => (
        <View key={p.id} style={styles.piece}>
          {p.hex ? <Swatch color={p.hex} /> : <View style={[styles.noColor, { borderColor: c.line }]} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="bold" style={{ fontSize: 14.5 }}>{p.name}</T>
            <T v="small">{attLine(p)}</T>
          </View>
          {an.size > 0 && <T v="tiny">{an.has(p.id) ? tag : 'dolabından'}</T>}
        </View>
      ))}
      <Reasons why={[...o.why.filter(x => x.d > 0).slice(0, 3), ...o.why.filter(x => x.d < 0).slice(0, 2)]} />
    </View>
  );
}

function Reasons({ why }: { why: { d: number; t: string }[] }) {
  const c = useColors();
  return (
    <View style={{ gap: 2 }}>
      {why.map((x, i) => (
        <T key={i} v="small" style={{ color: x.d < 0 ? c.late : c.ink }}>{x.d < 0 ? '✗' : '✓'} {x.t}</T>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  anchor: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 12 },
  box: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  piece: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noColor: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, borderStyle: 'dashed' },
});
