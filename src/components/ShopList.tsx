import { requireOptionalNativeModule } from 'expo-modules-core';

import { shopLine } from '@/domain/logic';
import type { StockItem } from '@/domain/types';

import { useToast } from './Toast';
import { Btn, SecHead, T } from './ui';

/** Alışveriş listesi başlığı, metni ve "Kopyala" butonu. */
export function ShopList({ items, title, h = 'h3' }: { items: StockItem[]; title: string; h?: 'h2' | 'h3' }) {
  const toast = useToast();
  if (!items.length) return null;
  const copy = async () => {
    try {
      await (requireOptionalNativeModule('ExpoClipboard') ? (require('expo-clipboard') as typeof import('expo-clipboard')) : null)?.setStringAsync(items.map(x => '- ' + shopLine(x)).join('\n'));
      toast('Alışveriş listesi kopyalandı.');
    } catch {
      toast('Liste kopyalanamadı.');
    }
  };
  return (
    <>
      <SecHead title={title} h={h} right={<Btn label="Kopyala" kind="ghost" small onPress={copy} />} />
      <T selectable style={{ lineHeight: 22 }}>{items.map(shopLine).join(', ')}</T>
    </>
  );
}
