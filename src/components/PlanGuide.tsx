import { useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, Sheet, T } from '@/components/ui';
import { flag } from '@/lib/firstRun';
import { useColors } from '@/theme';

const STEPS = [
  { emoji: '🏠', title: 'Hazır bir plan seç', text: 'Evine benzeyen bir plana dokun. Hepsini sonra değiştirebilirsin.' },
  { emoji: '🖌️', title: 'Odayı boya', text: '"Kendim çizeyim"e dokun, bir oda seç, kutulara dokun ya da parmağını sürükle. Yanlış olursa silgi ya da geri al var.' },
  { emoji: '✅', title: 'Kaydet', text: 'Evin hazır olunca en alttaki düğmeye bas. Planı istediğin zaman yeniden düzenleyebilirsin.' },
];

const KEY = 'planGuide';

/** Ev çizim ekranı rehberi: 3 kısa adım, ilk ziyarette bir kez açılır, "?" ile tekrar açılır. */
export function PlanGuide({ ready }: { ready: boolean }) {
  const c = useColors();
  const [open, setOpen] = useState(() => !flag.has(KEY));
  const [i, setI] = useState(0);
  const close = () => { flag.set(KEY); setOpen(false); setI(0); };
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <>
      <Btn small label="❓ Nasıl çizilir?" onPress={() => { setI(0); setOpen(true); }} />
      <Sheet open={open && ready} onClose={close} pose="handyman">
        <View style={{ gap: 12, alignItems: 'center', paddingTop: 8 }}>
          <T v="tiny">{`${i + 1} / ${STEPS.length}`}</T>
          <Text style={{ fontSize: 56 }}>{s.emoji}</Text>
          <T v="h2" style={{ textAlign: 'center' }}>{s.title}</T>
          <T style={{ textAlign: 'center', fontSize: 16, lineHeight: 25, color: c.ink }}>{s.text}</T>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STEPS.map((_, k) => <View key={k} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: k === i ? c.accent : c.line }} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
            {!last && <Btn label="Geç" kind="ghost" style={{ flex: 1, minHeight: 52 }} onPress={close} />}
            <Btn label={last ? 'Anladım' : 'Devam'} kind="primary" style={{ flex: 2, minHeight: 52 }} onPress={() => (last ? close() : setI(i + 1))} />
          </View>
        </View>
      </Sheet>
    </>
  );
}
