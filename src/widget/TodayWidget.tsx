import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { fonts, palettes, radius, type Colors } from '@/theme';

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
  /** "Yaptım"dan hemen sonra günün cümlesi yerine görünen kısa not (puan, seri). */
  note?: string | null;
  c: WColors;
};

/** Kaç iş satırı sığar: başlık ve alt satır çıkınca kalan yükseklik, satır başına ~44 dp. */
const rowsFor = (height: number) => Math.max(1, Math.min(4, Math.floor((height - 84) / 44)));

/** Ana ekran widget'ı: seri, bugünün işleri ("Yaptım" düğmesiyle) ve günün cümlesi. */
export function TodayWidget({ data, height, note, c }: Props) {
  const rows = rowsFor(height);
  const shown = data.tasks.slice(0, rows);
  const more = data.tasks.length - shown.length;
  const title = data.vacation ? 'Tatildesin 🏖️' : data.left ? `Bugün ${data.left} iş` : 'Bugün';
  const streakText = data.streak ? `🔥 ${data.streak} gün` : '🔥 Seriyi başlat';

  return (
    <FlexWidget
      {...OPEN}
      accessibilityLabel="Homezy, bugünün işleri"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: c.bg,
        borderRadius: radius.card,
        padding: 14,
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextWidget text={title} style={{ fontFamily: fonts.displayBold, fontSize: 19, color: c.ink }} maxLines={1} truncate="END" />
        <FlexWidget
          style={{
            backgroundColor: data.active || !data.streak ? c.todaySoft : c.lateSoft,
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={data.active || !data.streak ? streakText : `${streakText} · bekliyor`}
            style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: data.active || !data.streak ? c.today : c.late }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'column', justifyContent: 'center', flexGap: 6, marginTop: 8, marginBottom: 6 }}>
        {shown.length ? (
          shown.map(t => <Row key={t.id} t={t} c={c} />)
        ) : (
          <TextWidget
            text={data.vacation ? 'Rutinler dondu, iyi dinlen.' : data.done ? `Bugünlük her şey tamam 🎉 ${data.done} iş bitti.` : 'Bugünlük her şey tamam 🎉'}
            style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ink }}
            maxLines={2}
          />
        )}
      </FlexWidget>

      <TextWidget
        text={note ?? (more > 0 ? `+${more} iş daha · ${data.tip.emoji} ${data.tip.text}` : `${data.tip.emoji} ${data.tip.text}`)}
        style={{ fontFamily: fonts.body, fontSize: 12, color: note ? c.ok : c.muted }}
        maxLines={height >= 200 ? 2 : 1}
        truncate="END"
      />
    </FlexWidget>
  );
}

function Row({ t, c }: { t: WidgetTask; c: WColors }) {
  return (
    <FlexWidget
      {...OPEN}
      style={{
        width: 'match_parent',
        height: 38,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        borderRadius: 14,
        paddingLeft: 10,
        paddingRight: 4,
      }}
    >
      <TextWidget text={t.emoji} style={{ fontSize: 16, marginRight: 8 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={t.name} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.ink }} maxLines={1} truncate="END" />
        <TextWidget
          text={`${t.room} · ${t.label}`}
          style={{ fontFamily: fonts.body, fontSize: 11, color: t.late ? c.late : c.muted }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
      <FlexWidget
        clickAction={DONE_ACTION}
        clickActionData={{ tid: t.id }}
        accessibilityLabel={`${t.name}: yaptım`}
        style={{
          width: 30,
          height: 30,
          marginLeft: 6,
          borderRadius: 15,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text="✓" style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.onAccent }} />
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
