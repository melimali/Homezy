import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';

import { RigBody } from '@/components/MokaRig';

const BAS = ['bas_balkabagi', 'bas_kahve_cekirdegi_tac', 'bas_mantar', 'bas_kus_yuvasi', 'bas_cay_demligi', 'bas_kruvasan', 'bas_uyku_takkesi', 'bas_cicek_saksi', 'bas_dondurma', 'bas_yagmur_bulutu', 'bas_hasir_sapka', 'bas_kedi_kulagi', 'bas_asci_sapkasi', 'bas_tac', 'bas_kulaklik', 'bas_yilbasi', 'bas_buyucu', 'bas_korsan', 'bas_pamuk_seker', 'bas_kar_adam'];
const GOVDE = ['govde_kazak', 'govde_onluk', 'govde_pelerin', 'govde_yelek', 'govde_pijama', 'govde_mont', 'govde_kaplan', 'govde_pizza', 'govde_battaniye', 'govde_yagmurluk', 'govde_pilot', 'govde_tisort_kahve', 'govde_hirka', 'govde_sef_ceketi', 'govde_kimono', 'govde_dev_cicek', 'govde_tulum', 'govde_sporcu', 'govde_kral_pelerini', 'govde_balikci_yelegi'];
const EL = ['el_fincan', 'el_kitap', 'el_cicek', 'el_supurge', 'el_balon', 'el_telefon', 'el_kilic', 'el_degnek', 'el_gitar', 'el_olta', 'el_firca', 'el_semsiye', 'el_hediye', 'el_pasta', 'el_fener', 'el_harita', 'el_megafon', 'el_mum', 'el_sulama', 'el_kamera'];

/** Geçici geliştirici galerisi: ?m=bas | govde | el | semsiye (şemsiye ve balon + her kıyafet). Yayına girmez. */
export default function ElDeneme() {
  const { m } = useLocalSearchParams<{ m?: string }>();
  const [z] = useState(() => new Animated.Value(0));
  const [one] = useState(() => new Animated.Value(1));
  const S = m === 'yakin' || m === 'tam' ? 210 : 125;
  const cells: { key: string; worn: Record<string, string | undefined> }[] =
    m === 'tam' ? EL.map(e => ({ key: e, worn: { el: e, bas: 'bas_hasir_sapka', govde: 'govde_kazak' } })) :
    m === 'yakin' ? ['el_semsiye','el_kitap','el_mum','el_harita','el_kamera','el_telefon'].map(e => ({ key: e, worn: { el: e, bas: 'bas_hasir_sapka', govde: 'govde_kazak' } })) :
    m === 'bas' ? BAS.map(b => ({ key: b, worn: { bas: b, el: 'el_fincan' } })) :
    m === 'govde' ? GOVDE.map(g => ({ key: g, worn: { govde: g, el: 'el_fincan' } })) :
    m === 'semsiye' ? [...GOVDE.map(g => ({ key: g + '+semsiye', worn: { govde: g, el: 'el_semsiye' } })), ...BAS.slice(0, 4).map(b => ({ key: b + '+balon', worn: { bas: b, el: 'el_balon' } }))] :
    EL.map(e => ({ key: e, worn: { el: e, bas: 'bas_hasir_sapka', govde: 'govde_kazak' } }));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#5C7F6B' }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingTop: 36 }}>
      {cells.map(c => (
        <View key={c.key} style={{ width: m === 'yakin' || m === 'tam' ? '50%' : '33.33%', alignItems: 'center' }}>
          <View style={{ width: S, height: S * 0.95 }}>
            <RigBody size={S} fur={null} worn={c.worn} sway={z} lag={z} wing={z} tail={z} blink={one} look={z} mouth={z} breath={z} />
          </View>
          <Text style={{ color: '#fff', fontSize: 9 }}>{c.key.replace('govde_', '').replace('bas_', '')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
