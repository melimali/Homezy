import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { tx } from '@/i18n/runtime';
import { fonts, palettes, type Colors } from '@/theme';

import type { WidgetData, WidgetTask } from './data';

/** Uygulamada widget'ın adı; app.json'daki `react-native-android-widget` ayarıyla aynı olmalı. */
export const WIDGET_NAME = 'Bugun';
/** İş satırındaki yuvarlak düğme bu eylemi gönderir. */
export const DONE_ACTION = 'YAPTIM';

/** Tema renkleri (hepsi #RRGGBB ya da rgba) widget'ın renk türüyle. */
type WColors = { [K in keyof Colors]: Colors[K] extends string ? ColorProp : Colors[K] };
const asWidget = (c: Colors) => c as unknown as WColors;

const OPEN = { clickAction: 'OPEN_URI', clickActionData: { uri: 'homezy://bugun' } } as const;

type Props = {
  data: WidgetData;
  /** Widget yüksekliği (dp); kaç iş satırı sığacağını belirler. */
  height: number;
  /** "Yaptım"dan hemen sonra Moka'nın balonunda görünen kısa not (puan, seri). */
  note?: string | null;
  c: WColors;
};

/** Kaç iş satırı sığar: başlık çıkınca kalan yükseklik, satır başına ~44 dp. */
const rowsFor = (height: number) => Math.max(1, Math.min(4, Math.floor((height - 64) / 44)));

/** Ana ekran widget'ı (sade): başlık + seri, bugünün işleri ("Yaptım" düğmesiyle). */
export function TodayWidget({ data, height, note, c }: Props) {
  const shown = data.tasks.slice(0, rowsFor(height));
  const more = data.tasks.length - shown.length;
  const title = data.vacation ? tx('Tatildesin') : data.left ? tx(`Bugün ${data.left} iş`) : tx('Her şey tamam');
  const sub = note ?? (more > 0 ? `+${more} ${tx('iş daha')}` : data.total ? tx(`${Math.min(data.done, data.total)}/${data.total} bitti`) : 'Homezy');

  return (
    <FlexWidget
      {...OPEN}
      accessibilityLabel="Homezy, bugünün işleri"
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', backgroundColor: c.surface, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14 }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={title} style={{ fontFamily: fonts.displayBold, fontSize: 20, color: c.ink }} maxLines={1} truncate="END" />
          <TextWidget text={sub} style={{ fontFamily: fonts.body, fontSize: 11, color: note ? c.ok : c.muted }} maxLines={1} truncate="END" />
        </FlexWidget>
        {data.streak ? <TextWidget text={`🔥 ${data.streak}`} style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.today }} /> : null}
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'column', justifyContent: 'center', marginTop: 6 }}>
        {shown.length ? (
          shown.map(t => <Row key={t.id} t={t} c={c} />)
        ) : (
          <TextWidget
            text={data.vacation ? tx('🏖️ Rutinler dondu, iyi dinlen.') : tx('🎉 Bugünlük tamam!')}
            style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ok }}
            maxLines={2}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

function Row({ t, c }: { t: WidgetTask; c: WColors }) {
  return (
    <FlexWidget {...OPEN} style={{ width: 'match_parent', height: 40, flexDirection: 'row', alignItems: 'center' }}>
      <TextWidget text={t.emoji} style={{ fontSize: 18, marginRight: 10 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={tx(t.name)} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ink }} maxLines={1} truncate="END" />
        <TextWidget text={tx(`${t.room} · ${t.label}`)} style={{ fontFamily: fonts.body, fontSize: 10, color: t.late ? c.late : c.muted }} maxLines={1} truncate="END" />
      </FlexWidget>
      <FlexWidget
        clickAction={DONE_ACTION}
        clickActionData={{ tid: t.id }}
        accessibilityLabel={`${t.name}: ${tx('yaptım')}`}
        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}
      >
        <TextWidget text="✓" style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.accent }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** Açık ve koyu tema birlikte; telefon temayı değiştirince widget kendiliğinden geçer. */
export function todayWidget(data: WidgetData, height: number, note?: string | null) {
  return {
    light: <TodayWidget data={data} height={height} note={note} c={asWidget(palettes.light)} />,
    dark: <TodayWidget data={data} height={height} note={note} c={asWidget(palettes.dark)} />,
  };
}
