import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Squish } from '@/components/motion';
import { BackLink, Btn, Card, Chip, EmptyMsg, Field, Screen, Sheet, T, XBtn } from '@/components/ui';
import { everyText, itemState, lastText, markPetDone, newPet, newPetItem, PET_KINDS, petEmoji, PRESETS, removePet, stateText, undoPetDone } from '@/domain/pets';
import type { Pet, PetItem, PetKind } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Evcil hayvanlar: hayvanını ekle, bakım işlerini (mama, yıkama, aşı…) kendin belirle, "Şimdi yaptım" ile
 * son yapılma zamanını kaydet. Vakti gelince bildirim gelir ("Yaptım" / "1 saat sonra" düğmeleriyle).
 */
export default function Evcil() {
  const now = useNow();
  const { state: S, update } = useStore();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [petOpen, setPetOpen] = useState(add === '1' && !S.pets.length);
  const [itemFor, setItemFor] = useState<string | null>(null);

  const patchItem = (pid: string, iid: string, fn: (it: PetItem) => void) =>
    update(D => void fn(D.pets.find(p => p.id === pid)!.items.find(i => i.id === iid)!));

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Evcil hayvanlarım</T>
        <T v="h1">Küçük dostlar 🐾</T>
        <T v="lead">Mama, yıkama, aşı… Neyi ne zaman yaptığını not al, vaktinde hatırlatayım.</T>
      </View>

      {!S.pets.length && <EmptyMsg>Henüz evcil hayvan eklemedin. Ekle, bakım işlerini sen seç.</EmptyMsg>}

      {S.pets.map(p => (
        <Card key={p.id}>
          <View style={st.head}>
            <Text style={{ lineHeight: 39, fontSize: 30 }}>{petEmoji(p)}</Text>
            <View style={{ flex: 1 }}>
              <T v="h3">{p.name}</T>
              <T v="small">{PET_KINDS.find(k => k.id === p.kind)?.label}</T>
            </View>
            <XBtn label={`${p.name} hayvanını sil`} onPress={() => update(D => void removePet(D, p.id))} />
          </View>
          {!p.items.length && <T v="small">Bakım işi ekle: mama, yıkama, yürüyüş, aşı… (hepsi sana kalmış)</T>}
          <View style={{ gap: 10 }}>
            {p.items.map(it => <ItemRow key={it.id} pet={p} it={it} now={now}
              onDone={() => update(D => void markPetDone(D, p.id, it.id))}
              onUndo={() => update(D => void undoPetDone(D, p.id, it.id))}
              onRemind={() => patchItem(p.id, it.id, x => void (x.remind = !x.remind))}
              onDelete={() => update(D => void (D.pets.find(x => x.id === p.id)!.items = D.pets.find(x => x.id === p.id)!.items.filter(i => i.id !== it.id)))} />)}
          </View>
          <Btn kind="soft" label="+ Bakım işi ekle" onPress={() => setItemFor(p.id)} />
        </Card>
      ))}

      <Btn kind={S.pets.length ? 'soft' : 'primary'} label="+ Evcil hayvan ekle" onPress={() => setPetOpen(true)} />
      <T v="tiny" style={{ textAlign: 'center' }}>Bildirimleri Bildirimler sekmesinden açıp kapatabilirsin. Her işin hatırlatmasını ayrıca seçersin.</T>

      <PetSheet open={petOpen} onClose={() => setPetOpen(false)} onSave={(n, k, e) => {
        const pet = newPet(n, k, e);
        update(D => void D.pets.push(pet));
        setPetOpen(false);
        setItemFor(pet.id);
      }} />
      <ItemSheet pet={S.pets.find(p => p.id === itemFor) ?? null} onClose={() => setItemFor(null)}
        onSave={(name, emoji, h, remind) => {
          const pid = itemFor;
          if (pid) update(D => void D.pets.find(p => p.id === pid)?.items.push(newPetItem(name, emoji, h, Date.now(), remind)));
        }} />
    </Screen>
  );
}

function ItemRow({ pet, it, now, onDone, onUndo, onRemind, onDelete }: { pet: Pet; it: PetItem; now: number; onDone: () => void; onUndo: () => void; onRemind: () => void; onDelete: () => void }) {
  const c = useColors();
  const s = itemState(it, now);
  const bg = s.k === 'late' ? c.todaySoft : s.k === 'today' ? c.accentSoft : c.surface2;
  const justDone = it.last != null && now - it.last < 6e4 * 10;
  return (
    <View style={[st.item, { backgroundColor: bg }]}>
      <View style={st.itemTop}>
        <Text style={{ lineHeight: 31, fontSize: 24 }}>{it.emoji}</Text>
        <View style={{ flex: 1 }}>
          <T v="bold" style={{ fontSize: 15 }}>{it.name}</T>
          <T v="small">{everyText(it.everyH)} · {lastText(it, now)}</T>
          <T v="small" style={{ color: s.k === 'late' ? c.late : c.muted, fontFamily: fonts.bodyBold }}>{stateText(s)}</T>
        </View>
        {justDone ? <Btn small label="Geri al" onPress={onUndo} accessibilityLabel={`${pet.name} ${it.name} kaydını geri al`} /> : <Btn small kind="primary" label="Şimdi yaptım" onPress={onDone} accessibilityLabel={`${pet.name} ${it.name} şimdi yaptım`} />}
      </View>
      <View style={st.itemFoot}>
        <Chip label={it.remind ? '🔔 Hatırlat' : '🔕 Hatırlatma yok'} on={it.remind} onPress={onRemind} />
        <XBtn label={`${it.name} işini sil`} onPress={onDelete} />
      </View>
    </View>
  );
}

function PetSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string, kind: PetKind, emoji: string) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PetKind>('kedi');
  const [emoji, setEmoji] = useState('');
  return (
    <Sheet open={open} onClose={onClose} scroll pose="happy">
      <T v="h2">Yeni evcil hayvan</T>
      <View style={st.wrap}>
        {PET_KINDS.map(k => <Chip key={k.id} label={`${k.emoji} ${k.label}`} on={kind === k.id} onPress={() => setKind(k.id)} />)}
      </View>
      <Field value={name} onChangeText={setName} placeholder="Adı (ör. Pamuk)" maxLength={24} accessibilityLabel="Evcil hayvan adı" />
      <Field value={emoji} onChangeText={setEmoji} placeholder="İstersen kendi emojin (ör. 🐇)" maxLength={4} accessibilityLabel="Emoji" />
      <Btn kind="primary" label="Ekle" disabled={!name.trim()} onPress={() => { onSave(name, kind, emoji); setName(''); setEmoji(''); setKind('kedi'); }} />
    </Sheet>
  );
}

const UNITS = [['saat', 1], ['gün', 24]] as const;

function ItemSheet({ pet, onClose, onSave }: { pet: Pet | null; onClose: () => void; onSave: (name: string, emoji: string, h: number, remind: boolean) => void }) {
  const c = useColors();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [n, setN] = useState(12);
  const [unit, setUnit] = useState<1 | 24>(1);
  const [remind, setRemind] = useState(true);
  const have = new Set((pet?.items ?? []).map(i => i.name));
  const pick = (p: { name: string; emoji: string; h: number }) => {
    setName(p.name);
    setEmoji(p.emoji);
    if (p.h % 24 === 0) { setUnit(24); setN(p.h / 24); } else { setUnit(1); setN(p.h); }
  };
  const reset = () => { setName(''); setEmoji(''); setN(12); setUnit(1); setRemind(true); };
  const step = (d: number) => setN(x => Math.max(1, Math.min(unit === 1 ? 72 : 730, x + d)));
  return (
    <Sheet open={!!pet} onClose={onClose} scroll pose="happy">
      <T v="h2">{pet ? `${pet.name} için bakım işi` : ' '}</T>
      <T v="small">Hazır önerilerden seç ya da kendi işini yaz:</T>
      <View style={st.wrap}>
        {(pet ? PRESETS[pet.kind] : []).filter(p => !have.has(p.name)).map(p => <Chip key={p.name} label={`${p.emoji} ${p.name}`} on={name === p.name} onPress={() => pick(p)} />)}
      </View>
      <Field value={name} onChangeText={setName} placeholder="İşin adı (ör. Mama, Yıkama, Aşı)" maxLength={30} accessibilityLabel="İşin adı" />
      <Field value={emoji} onChangeText={setEmoji} placeholder="Emoji (isteğe bağlı)" maxLength={4} accessibilityLabel="Emoji" />
      <T v="h3">Ne sıklıkla?</T>
      <View style={st.timeRow}>
        <Squish onPress={() => step(-1)} accessibilityLabel="Azalt" style={[st.step, { backgroundColor: c.surface2 }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink }}>−</Text>
        </Squish>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: c.ink, minWidth: 50, textAlign: 'center' }}>{n}</Text>
        <Squish onPress={() => step(1)} accessibilityLabel="Artır" style={[st.step, { backgroundColor: c.surface2 }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink }}>+</Text>
        </Squish>
        {UNITS.map(([l, m]) => <Chip key={l} label={l} on={unit === m} onPress={() => setUnit(m)} />)}
      </View>
      <T v="small">{everyText(n * unit)}</T>
      <Chip label={remind ? '🔔 Vaktinde hatırlat' : '🔕 Hatırlatma yok'} on={remind} onPress={() => setRemind(r => !r)} />
      <Btn kind="primary" label="Ekle" disabled={!name.trim()} onPress={() => { onSave(name, emoji, n * unit, remind); reset(); onClose(); }} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { borderRadius: radius.tile, padding: 12, gap: 8 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
