import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { tx } from '@/i18n/runtime';
import { fonts, palettes, type Colors } from '@/theme';

import type { MiniData } from './data';

/** app.json'daki `react-native-android-widget` ayarıyla aynı olmalı. */
export const MINI_WIDGET_NAME = 'Mini';
export const MINI_WATER = 'MINI_SU';
export const MINI_MED = 'MINI_ILAC';
export const MINI_SHOP = 'MINI_MARKET';
export const MINI_TASK = 'MINI_GOREV';

type WColors = { [K in keyof Colors]: Colors[K] extends string ? ColorProp : Colors[K] };
const asWidget = (c: Colors) => c as unknown as WColors;
const open = (route: string) => ({ clickAction: 'OPEN_URI', clickActionData: { uri: `homezy://${route}` } }) as const;

type TileProps = {
  label: string;
  value: string;
  sub?: string;
  subColor?: ColorProp;
  route: string;
  /** Sağdaki yuvarlak düğme; yoksa karo sadece uygulamayı açar. */
  action?: { name: string; data?: Record<string, string>; text: string; label: string };
  bar?: { pct: number; color: ColorProp; track: ColorProp };
  c: WColors;
  tall: boolean;
};

function Tile({ label, value, sub, subColor, route, action, bar, c, tall }: TileProps) {
  return (
    <FlexWidget
      {...open(route)}
      accessibilityLabel={`${label}: ${value}`}
      style={{ flex: 1, height: 'match_parent', flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2, borderRadius: 18, paddingLeft: 10, paddingRight: 6 }}
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <TextWidget text={label} style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: c.muted }} maxLines={1} truncate="END" />
        <TextWidget text={value} style={{ fontFamily: fonts.displayBold, fontSize: tall ? 16 : 14, color: c.ink }} maxLines={1} truncate="END" />
        {bar ? (
          <FlexWidget style={{ width: 'match_parent', height: 5, borderRadius: 3, backgroundColor: bar.track, marginTop: 3, flexDirection: 'row' }}>
            <FlexWidget style={{ flex: Math.max(bar.pct, 4), height: 5, borderRadius: 3, backgroundColor: bar.color }} />
            <FlexWidget style={{ flex: Math.max(100 - bar.pct, 0.001), height: 5 }} />
          </FlexWidget>
        ) : tall && sub ? (
          <TextWidget text={sub} style={{ fontFamily: fonts.body, fontSize: 10, color: subColor ?? c.muted }} maxLines={1} truncate="END" />
        ) : null}
      </FlexWidget>
      {action ? (
        <FlexWidget
          clickAction={action.name}
          clickActionData={action.data}
          accessibilityLabel={action.label}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}
        >
          <TextWidget text={action.text} style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.onAccent }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

type Props = { data: MiniData; height: number; note?: string | null; c: WColors };

/** Küçük çoklu widget: 2×2 karo (su, ilaç, market, aktif görev); yüksekse üstte Moka başlığı. */
export function MiniWidget({ data, height, note, c }: Props) {
  const tall = height >= 170;
  const { water, med, shop, task } = data;

  const waterTile = (
    <Tile
      c={c}
      tall={tall}
      route="aliskanlik"
      label={tx('💧 Su')}
      value={`${water.n}/${water.goal}`}
      bar={{ pct: water.pct, color: water.met ? c.ok : c.hi, track: c.line }}
      action={{ name: MINI_WATER, text: '+', label: tx('Bir bardak ekle') }}
    />
  );

  const medTile = !med ? (
    <Tile c={c} tall={tall} route="ilac" label={tx('💊 İlaç')} value={tx('Ekle')} sub={tx('Hatırlatıcı kur')} />
  ) : med.name ? (
    <Tile
      c={c}
      tall={tall}
      route="ilac"
      label={`${tx('💊 İlaç')} · ${med.time}`}
      value={med.name}
      sub={med.late ? tx('Vakti geçti') : `${med.total - med.left}/${med.total} ${tx('alındı')}`}
      subColor={med.late ? c.late : c.muted}
      action={{ name: MINI_MED, data: { key: med.key }, text: '✓', label: `${med.name}: ${tx('Aldım')}` }}
    />
  ) : (
    <Tile c={c} tall={tall} route="ilac" label={tx('💊 İlaç')} value={tx('Hepsi tamam ✓')} sub={`${med.total}/${med.total} ${tx('alındı')}`} />
  );

  const shopTile = shop ? (
    <Tile
      c={c}
      tall={tall}
      route="bugun"
      label={`${tx('🛒 Market')} · ${shop.total}`}
      value={shop.name}
      sub={shop.more ? `+${shop.more} ${tx('ürün daha')}` : tx('Son ürün')}
      action={{ name: MINI_SHOP, data: { id: shop.id }, text: '✓', label: `${shop.name}: ${tx('alındı')}` }}
    />
  ) : (
    <Tile c={c} tall={tall} route="bugun" label={tx('🛒 Market')} value={tx('Liste temiz')} sub={tx('Eksik ürün yok')} />
  );

  const taskTile = task ? (
    <Tile
      c={c}
      tall={tall}
      route="bugun"
      label={task.late ? tx('✨ Görev · gecikti') : tx('✨ Görev')}
      value={`${task.emoji} ${task.name}`}
      sub={task.more ? `${task.room} · +${task.more}` : task.room}
      subColor={task.late ? c.late : c.muted}
      action={{ name: MINI_TASK, data: { tid: task.id }, text: '✓', label: `${task.name}: ${tx('Yaptım')}` }}
    />
  ) : (
    <Tile c={c} tall={tall} route="bugun" label={tx('✨ Görev')} value={tx('Bugünlük tamam 🎉')} sub={tx('Moka gurur duyuyor')} />
  );

  return (
    <FlexWidget
      {...open('')}
      accessibilityLabel="Homezy"
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', backgroundColor: c.surface, borderRadius: 26, padding: 8 }}
    >
      {tall ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 6 }}>
          <TextWidget text={`${data.mood.emoji} ${note ?? tx(data.mood.line)}`} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: note ? c.ok : c.ink }} maxLines={1} truncate="END" />
          <FlexWidget style={{ flex: 1 }} />
          {data.streak ? <TextWidget text={`🔥 ${data.streak}`} style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: c.today }} /> : null}
        </FlexWidget>
      ) : null}
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row' }}>
        {waterTile}
        <FlexWidget style={{ width: 6 }} />
        {medTile}
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', height: 6 }} />
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row' }}>
        {shopTile}
        <FlexWidget style={{ width: 6 }} />
        {taskTile}
      </FlexWidget>
    </FlexWidget>
  );
}

/** Açık ve koyu tema birlikte; telefon temayı değiştirince widget kendiliğinden geçer. */
export function miniWidget(data: MiniData, height: number, note?: string | null) {
  return {
    light: <MiniWidget data={data} height={height} note={note} c={asWidget(palettes.light)} />,
    dark: <MiniWidget data={data} height={height} note={note} c={asWidget(palettes.dark)} />,
  };
}
