import { useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { PaperNote, NoteLine, type NoteHandle } from '@/components/PaperNote';
import { Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, EmptyMsg, Field, Screen, T, XBtn } from '@/components/ui';
import { dayKey } from '@/domain/play';
import { addShop, catOf, clearChecked, forgetUsual, forgotHints, removeShop, SHOP_CATS, shopLeft, shopText, suggestions, toggleShop } from '@/domain/shopping';
import type { ShopCat } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { brand, fonts, useColors } from '@/theme';

/** Alışveriş listesi: ekle, işaretle, sil, alınanları temizle, kategoriler, öneriler, sık alınanlar, metin olarak paylaş. */
export default function Alisveris() {
  const c = useColors();
  const toast = useToast();
  const now = useNow();
  const { state: S, update } = useStore();
  const [name, setName] = useState('');
  const note = useRef<NoteHandle>(null);
  const [cat, setCat] = useState<ShopCat>('market');
  const hints = S.shopHide === dayKey(now) ? [] : forgotHints(S, now);
  const sug = suggestions(S).slice(0, 10);
  const checked = S.shop.filter(i => i.done).length;
  const usual = S.shopUsual.filter(u => !S.shop.some(x => !x.done && x.cat === u.cat && x.name === u.name));

  const add = () => {
    const n = name;
    if (!n.trim()) return;
    update(D => void addShop(D, n, cat));
    setName('');
  };
  const share = async () => {
    const text = shopText(S);
    if (!text) return toast('Paylaşacak ürün yok.');
    try {
      await Share.share({ message: `🛒 Alışveriş listesi\n\n${text}` });
    } catch {
      toast('Liste paylaşılamadı.');
    }
  };

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Alışveriş</T>
        <T v="h1">Alışveriş listem 🛒</T>
        <T v="lead">Eksikleri yaz, markette işaretle, bitince temizle.</T>
      </View>

      <Card>
        <View style={st.wrap}>
          {SHOP_CATS.map(k => <Chip key={k.id} label={`${k.emoji} ${k.label}`} on={cat === k.id} onPress={() => setCat(k.id)} />)}
        </View>
        <Field value={name} onChangeText={setName} placeholder="Ürün (ör. deterjan, süt)" maxLength={40} returnKeyType="done" onSubmitEditing={add} accessibilityLabel="Ürün adı" />
        <Btn kind="primary" label="Ekle" disabled={!name.trim()} onPress={add} />
      </Card>

      {hints.length > 0 && (
        <Card>
          <View style={st.hintHead}>
            <T v="h3" style={{ flex: 1 }}>💡 İpucu: unutma!</T>
            <Btn small kind="ghost" label="Gizle" onPress={() => update(D => void (D.shopHide = dayKey(Date.now())))} />
          </View>
          <T v="small">Marketten çoğu kişi bunları unutur. Dokun, listeye eklensin.</T>
          <View style={st.wrap}>
            {hints.map(h => <Chip key={h.name} label={`${h.emoji} ${h.name}`} on={false} onPress={() => update(D => void addShop(D, h.name, h.cat))} />)}
          </View>
        </Card>
      )}

      {sug.length > 0 && (
        <Card>
          <T v="h3">Önerilenler</T>
          <T v="small">Dokun, listeye eklensin.</T>
          <View style={st.wrap}>
            {sug.map(s => <Chip key={s.cat + s.name} label={`+ ${s.name}`} on={false} onPress={() => update(D => void addShop(D, s.name, s.cat))} />)}
          </View>
        </Card>
      )}

      {!S.shop.length && <EmptyMsg>Liste boş. Bir ürün ekle ya da önerilerden seç.</EmptyMsg>}

      {S.shop.length > 0 && (
        <PaperNote ref={note}>
          <Text style={[st.noteTitle, { color: brand.navy }]}>🛒 Alışveriş listem</Text>
          {SHOP_CATS.map(k => {
            const xs = S.shop.filter(i => i.cat === k.id);
            if (!xs.length) return null;
            return (
              <View key={k.id}>
                <Text style={[st.cat, { color: brand.cocoa }]}>{k.emoji} {k.label}</Text>
                {xs.map(i => (
                  <NoteLine key={i.id} done={i.done} label={i.name}
                    onToggle={() => { update(D => void toggleShop(D, i.id)); note.current?.sway(); }}
                    right={<XBtn label={`${i.name} ürününü sil`} onPress={() => update(D => void removeShop(D, i.id))} />} />
                ))}
              </View>
            );
          })}
        </PaperNote>
      )}

      {S.shop.length > 0 && (
        <View style={st.wrap}>
          <Btn small kind="soft" label="Paylaş" onPress={share} disabled={!shopLeft(S)} />
          <Btn small kind="soft" label={`Alınanları temizle${checked ? ` (${checked})` : ''}`} disabled={!checked}
            onPress={() => { update(D => void clearChecked(D)); toast('Alınanlar temizlendi. Bitince “Sık alınanlar”dan tekrar eklersin.'); }} />
        </View>
      )}

      {usual.length > 0 && (
        <Card>
          <T v="h3">Sık alınanlar</T>
          <T v="small">Bitti mi? Dokun, tekrar listeye gelsin. Basılı tut, listeden kalksın.</T>
          <View style={st.wrap}>
            {usual.map(u => (
              <Squish key={u.cat + u.name} onPress={() => update(D => void addShop(D, u.name, u.cat))} onLongPress={() => update(D => void forgetUsual(D, u.name, u.cat))}
                accessibilityLabel={`${u.name} bitti, listeye ekle`} style={[st.usual, { backgroundColor: c.surface2 }]}>
                <T v="bold" style={{ fontSize: 14, fontFamily: fonts.bodyBold }}>{catOf(u.cat).emoji} {u.name} bitti</T>
              </Squish>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hintHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteTitle: { fontFamily: fonts.hand, fontSize: 34, lineHeight: 40, textAlign: 'center', marginBottom: 4 },
  cat: { fontFamily: fonts.hand, fontSize: 24, lineHeight: 30, marginTop: 8 },
  usual: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
});
