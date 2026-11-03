import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { fonts, palettes, type Colors } from '@/theme';

import type { ShopData } from './data';

export const SHOP_WIDGET_NAME = 'Market';
/** Satırdaki ✓ ürünü "Var" yapar (alındı); liste kendiliğinden kısalır. */
export const SHOP_BOUGHT = 'ALINDI';

type WColors = { [K in keyof Colors]: Colors[K] extends string ? ColorProp : Colors[K] };
const asWidget = (c: Colors) => c as unknown as WColors;
const OPEN = { clickAction: 'OPEN_URI', clickActionData: { uri: 'homezy://bugun' } } as const;

const rowsFor = (height: number) => Math.max(1, Math.min(6, Math.floor((height - 56) / 36)));

/** Market listesi widget'ı: biten/azalan ürünler, ✓ ile alındı işaretlenir. */
export function ShopWidget({ data, height, c }: { data: ShopData; height: number; c: WColors }) {
  const shown = data.items.slice(0, rowsFor(height));
  const more = data.items.length - shown.length;
  return (
    <FlexWidget
      {...OPEN}
      accessibilityLabel="Homezy, market listesi"
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', backgroundColor: c.surface, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14 }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text="🛒" style={{ fontSize: 20, marginRight: 8 }} />
        <TextWidget
          text={data.items.length ? `Market · ${data.items.length}` : 'Market'}
          style={{ fontFamily: fonts.displayBold, fontSize: 18, color: c.ink }}
          maxLines={1}
        />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'column', justifyContent: 'center', marginTop: 4 }}>
        {shown.length ? (
          shown.map(it => (
            <FlexWidget key={it.id} {...OPEN} style={{ width: 'match_parent', height: 36, flexDirection: 'row', alignItems: 'center' }}>
              <TextWidget
                text={it.low ? `${it.name} (azaldı)` : it.name}
                style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: it.low ? c.today : c.ink }}
                maxLines={1}
                truncate="END"
              />
              <FlexWidget
                clickAction={SHOP_BOUGHT}
                clickActionData={{ id: it.id }}
                accessibilityLabel={`${it.name}: alındı`}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}
              >
                <TextWidget text="✓" style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.accent }} />
              </FlexWidget>
            </FlexWidget>
          ))
        ) : (
          <TextWidget text="🎉 Eksik yok, liste temiz" style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ok }} maxLines={2} />
        )}
        {more > 0 ? <TextWidget text={`+${more} ürün daha`} style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted }} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}

export function shopWidget(data: ShopData, height: number) {
  return {
    light: <ShopWidget data={data} height={height} c={asWidget(palettes.light)} />,
    dark: <ShopWidget data={data} height={height} c={asWidget(palettes.dark)} />,
  };
}
