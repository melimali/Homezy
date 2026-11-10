import { useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PaperNote, NoteLine, type NoteHandle } from '@/components/PaperNote';
import { Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Bar, Btn, Card, Chip, EmptyMsg, Field, Screen, T, XBtn } from '@/components/ui';
import { cartTotal, listTotal, lastMonths, money, parsePrice, setLimit, setPrice, spentIn } from '@/domain/budget';
import { dayKey } from '@/domain/play';
import { addShop, catOf, clearChecked, forgetUsual, forgotHints, removeShop, SHOP_CATS, shopLeft, shopText, suggestions, toggleShop } from '@/domain/shopping';
import type { ShopCat } from '@/domain/types';
import { dateLocale, isEn, tx } from '@/i18n/runtime';
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
  const [editing, setEditing] = useState<string | null>(null);
  const [priceTxt, setPriceTxt] = useState('');
  const [limitTxt, setLimitTxt] = useState('');
  const [showBudget, setShowBudget] = useState(false);
  const month = spentIn(S, now);
  const limit = S.budget?.limit ?? 0;
  const edit = S.shop.find(i => i.id === editing);
  const savePrice = () => {
    const v = priceTxt.trim() ? parsePrice(priceTxt) : null;
    if (priceTxt.trim() && v == null) return toast('Geçerli bir fiyat yaz.');
    if (editing) update(D => void setPrice(D, editing, v));
    setEditing(null);
  };
  const saveLimit = () => {
    const v = limitTxt.trim() ? parsePrice(limitTxt) : 0;
    if (v == null) return toast('Geçerli bir tutar yaz.');
    update(D => void setLimit(D, v));
    toast(v ? 'Aylık bütçe kaydedildi.' : 'Bütçe sınırı kaldırıldı.');
  };
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

      <Card>
        <Pressable onPress={() => setShowBudget(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: showBudget }} accessibilityLabel="Bütçe">
          <View style={st.hintHead}>
            <T v="h3" style={{ flex: 1 }}>💰 Bütçe</T>
            <T v="bold">{money(month.total)}{limit ? ` / ${money(limit)}` : ''}</T>
          </View>
        </Pressable>
        {limit > 0 && <Bar value={Math.min(1, month.total / limit)} color={month.total > limit ? c.late : c.accent} track={c.surface2} height={10} />}
        {limit > 0 && month.total > limit && <T v="small" style={{ color: c.late }}>Bu ay bütçeyi aştın.</T>}
        {listTotal(S) > 0 && <T v="small">Listedeki tahmini toplam: {money(listTotal(S))}{cartTotal(S) > 0 ? ` · Sepet: ${money(cartTotal(S))}` : ''}</T>}
        {showBudget && (
          <>
            <T v="small">Ürünün yanındaki fiyata dokunup tutarı yaz. Alınanları temizleyince tutar bu ayın harcamasına yazılır.</T>
            <Field value={limitTxt} onChangeText={setLimitTxt} placeholder={limit ? `Aylık bütçe (şimdi ${money(limit)})` : 'Aylık bütçe (ör. 5000)'} keyboardType="decimal-pad" accessibilityLabel="Aylık bütçe" maxLength={9} />
            <Btn small kind="soft" label="Bütçeyi kaydet" onPress={saveLimit} />
            {lastMonths(S, 6, now).some(m => m.total > 0) && (
              <View style={st.months}>
                {lastMonths(S, 6, now).map(m => {
                  const peak = Math.max(...lastMonths(S, 6, now).map(x => x.total), 1);
                  return (
                    <View key={`${m.label}-${m.month}`} style={st.mcol} accessible accessibilityLabel={`${new Date(m.label, m.month, 1).toLocaleDateString(dateLocale(), { month: 'long' })}, ${money(m.total)}`}>
                      <View style={[st.mbar, { height: 6 + 54 * (m.total / peak), backgroundColor: m.total > 0 ? c.accent : c.surface2 }]} />
                      <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: c.muted }}>{new Date(m.label, m.month, 1).toLocaleDateString(dateLocale(), { month: 'short' })}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </Card>

      {edit && (
        <Card>
          <T v="bold">{edit.name} için fiyat</T>
          <Field value={priceTxt} onChangeText={setPriceTxt} placeholder="Fiyat (ör. 39,90)" keyboardType="decimal-pad" autoFocus accessibilityLabel="Fiyat" maxLength={9} onSubmitEditing={savePrice} />
          <View style={st.wrap}>
            <Btn small kind="primary" label="Kaydet" onPress={savePrice} />
            <Btn small kind="ghost" label="Vazgeç" onPress={() => setEditing(null)} />
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
                    right={(
                      <View style={st.right}>
                        <Pressable onPress={() => { setEditing(i.id); setPriceTxt(i.price ? String(i.price).replace('.', ',') : ''); }} hitSlop={8}
                          accessibilityRole="button" accessibilityLabel={tx(i.price ? `${i.name} fiyatı` : `${i.name} için fiyat ekle`)}
                          style={[st.price, { backgroundColor: 'rgba(40,48,68,0.1)' }]}>
                          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.bodyBlack, fontSize: 12.5, color: brand.navy }}>{i.price ? money(i.price) : isEn() ? '$ +' : '₺ +'}</Text>
                        </Pressable>
                        <XBtn label={`${i.name} ürününü sil`} onPress={() => update(D => void removeShop(D, i.id))} />
                      </View>
                    )} />
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
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { minHeight: 32, minWidth: 44, borderRadius: 999, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  months: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, paddingTop: 6 },
  mcol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  mbar: { width: '70%', borderRadius: 6 },
  usual: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
});
