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
  /** "Yaptım"dan hemen sonra Moka'nın balonunda görünen kısa not (puan, seri). */
  note?: string | null;
  c: WColors;
};

/** Kaç iş satırı sığar: başlık, ilerleme ve balon çıkınca kalan yükseklik, satır başına ~46 dp. */
const rowsFor = (height: number) => Math.max(1, Math.min(4, Math.floor((height - 112) / 46)));

/** Ana ekran widget'ı: Moka'nın ruh hali, seri, ilerleme çubuğu, bugünün işleri ("Yaptım" düğmesiyle) ve Moka'nın cümlesi. */
export function TodayWidget({ data, height, note, c }: Props) {
  const rows = rowsFor(height);
  const shown = data.tasks.slice(0, rows);
  const more = data.tasks.length - shown.length;
  const compact = height < 150;
  const title = data.vacation ? 'Tatildesin' : data.left ? `Bugün ${data.left} iş` : 'Her şey tamam';
  const streakOk = data.active || !data.streak;
  const streakText = data.streak ? `🔥 ${data.streak}` : '🔥 Başla';
  const bubble = note ?? (more > 0 ? `+${more} iş daha · ${data.tip.text}` : data.tip.text);

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
        padding: 12,
      }}
    >
      {/* Üst: Moka yüzü + başlık + seri */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
        >
          <TextWidget text={data.mood.emoji} style={{ fontSize: 22 }} />
        </FlexWidget>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={title} style={{ fontFamily: fonts.displayBold, fontSize: 18, color: c.ink }} maxLines={1} truncate="END" />
          <TextWidget text={`Moka · ${data.mood.line}`} style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted }} maxLines={1} truncate="END" />
        </FlexWidget>
        <FlexWidget
          style={{
            backgroundColor: streakOk ? c.todaySoft : c.lateSoft,
            borderRadius: radius.pill,
            paddingHorizontal: 11,
            paddingVertical: 4,
          }}
        >
          <TextWidget text={streakText} style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: streakOk ? c.today : c.late }} />
        </FlexWidget>
      </FlexWidget>

      {/* İlerleme çubuğu */}
      {data.total > 0 && !data.vacation ? <Progress done={data.done} total={data.total} c={c} /> : <FlexWidget style={{ height: 8 }} />}

      {/* İşler */}
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'column', justifyContent: 'center', flexGap: 6 }}>
        {shown.length ? (
          shown.map(t => <Row key={t.id} t={t} c={c} />)
        ) : (
          <FlexWidget
            style={{ width: 'match_parent', backgroundColor: c.okSoft, borderRadius: 18, padding: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <TextWidget
              text={data.vacation ? '🏖️ Rutinler dondu, iyi dinlen.' : data.done ? `🎉 Bugünlük tamam! ${data.done} iş bitti.` : '🎉 Bugünlük her şey tamam!'}
              style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ok }}
              maxLines={2}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* Moka'nın konuşma balonu */}
      {compact ? null : (
        <FlexWidget
          style={{
            width: 'match_parent',
            marginTop: 6,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: note ? c.okSoft : c.surface,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <TextWidget text="🦜" style={{ fontSize: 14, marginRight: 6 }} />
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text={bubble}
              style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: note ? c.ok : c.muted }}
              maxLines={height >= 220 ? 2 : 1}
              truncate="END"
            />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/** Biten / toplam: iki parçalı yuvarlak çubuk (flex oranıyla) ve sağda sayaç. */
function Progress({ done, total, c }: { done: number; total: number; c: WColors }) {
  const d = Math.min(done, total);
  const left = Math.max(total - d, 0);
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
      <FlexWidget style={{ flex: 1, height: 8, flexDirection: 'row', borderRadius: 4, backgroundColor: c.line }}>
        {d > 0 ? <FlexWidget style={{ flex: d, height: 8, backgroundColor: c.accent }} /> : null}
        {left > 0 ? <FlexWidget style={{ flex: left, height: 8 }} /> : null}
      </FlexWidget>
      <TextWidget text={`${d}/${total}`} style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: c.muted, marginLeft: 8 }} />
    </FlexWidget>
  );
}

function Row({ t, c }: { t: WidgetTask; c: WColors }) {
  return (
    <FlexWidget
      {...OPEN}
      style={{
        width: 'match_parent',
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        borderRadius: 20,
        paddingLeft: 6,
        paddingRight: 5,
      }}
    >
      <FlexWidget
        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.late ? c.lateSoft : c.todaySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
      >
        <TextWidget text={t.emoji} style={{ fontSize: 15 }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget text={t.name} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.ink }} maxLines={1} truncate="END" />
        <TextWidget
          text={`${t.room} · ${t.label}`}
          style={{ fontFamily: fonts.body, fontSize: 10, color: t.late ? c.late : c.muted }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
      <FlexWidget
        clickAction={DONE_ACTION}
        clickActionData={{ tid: t.id }}
        accessibilityLabel={`${t.name}: yaptım`}
        style={{
          width: 32,
          height: 32,
          marginLeft: 6,
          borderRadius: 16,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text="✓" style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.onAccent }} />
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
