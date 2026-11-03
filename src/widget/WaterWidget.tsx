import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { fonts, palettes, type Colors } from '@/theme';

import type { WaterData } from './data';

export const WATER_WIDGET_NAME = 'Su';
export const WATER_ADD = 'SU_EKLE';
export const WATER_UNDO = 'SU_GERI';

type WColors = { [K in keyof Colors]: Colors[K] extends string ? ColorProp : Colors[K] };
const asWidget = (c: Colors) => c as unknown as WColors;
const OPEN = { clickAction: 'OPEN_URI', clickActionData: { uri: 'homezy://aliskanlik' } } as const;

/** Su içme widget'ı: ilerleme çubuğu, +1 bardak ve geri al. */
export function WaterWidget({ data, c }: { data: WaterData; c: WColors }) {
  const bar = Math.max(4, data.pct);
  return (
    <FlexWidget
      {...OPEN}
      accessibilityLabel="Homezy, su takibi"
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', justifyContent: 'center', backgroundColor: c.surface, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 12 }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text="💧" style={{ fontSize: 24, marginRight: 8 }} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={`${data.n} / ${data.goal} bardak`} style={{ fontFamily: fonts.displayBold, fontSize: 18, color: c.ink }} maxLines={1} />
          <TextWidget text={data.line} style={{ fontFamily: fonts.body, fontSize: 11, color: data.met ? c.ok : c.muted }} maxLines={1} truncate="END" />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', height: 8, borderRadius: 4, backgroundColor: c.accentSoft, marginTop: 8, marginBottom: 8, flexDirection: 'row' }}>
        <FlexWidget style={{ flex: Math.max(bar, 1), height: 8, borderRadius: 4, backgroundColor: c.accent }} />
        <FlexWidget style={{ flex: Math.max(100 - bar, 0.001), height: 8 }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget
          clickAction={WATER_ADD}
          accessibilityLabel="Bir bardak ekle"
          style={{ flex: 1, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <TextWidget text="+ Bir bardak" style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.onAccent }} />
        </FlexWidget>
        <FlexWidget
          clickAction={WATER_UNDO}
          accessibilityLabel="Geri al"
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
        >
          <TextWidget text="−" style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.accent }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export function waterWidget(data: WaterData) {
  return {
    light: <WaterWidget data={data} c={asWidget(palettes.light)} />,
    dark: <WaterWidget data={data} c={asWidget(palettes.dark)} />,
  };
}
