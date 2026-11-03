import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, useColors } from '@/theme';

/**
 * Supabase Auth'ta captcha (Cloudflare Turnstile) açıksa giriş, kayıt, şifre yenileme ve misafir
 * oturumu bir `captchaToken` ister. Site anahtarı `EXPO_PUBLIC_TURNSTILE_SITE_KEY`'dedir
 * (kurulum: docs/hesap.md). Anahtar yoksa, web'deyse ya da `react-native-webview` bu derlemede
 * yoksa token istenmez (undefined); Supabase'de captcha kapalıyken hiçbir şey değişmez.
 *
 * İki kullanım var:
 * - Kişinin bastığı düğmeler (giriş, kayıt, "Hesapsız devam et"): kutu hemen açılır, ne olduğunu
 *   yazar, çoğu kişide doğrulama kendiliğinden biter; sınav gerekirse "kutuya dokun" der.
 * - Arka plan (`silent`, ör. misafir oturumunu yenileme): kutu hiç görünmez; sınav gerekirse
 *   vazgeçilir, kişinin karşısına çıkmaz.
 * Widget bir WebView içinde açılır; kökeni (baseUrl) Turnstile'daki izinli alan adlarından biri olmalı.
 */
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
const ORIGIN = process.env.EXPO_PUBLIC_TURNSTILE_ORIGIN || 'https://themeikai.com';
const SILENT_TIMEOUT_MS = 8000;
const LOAD_TIMEOUT_MS = 20000;

type Pending = { resolve: (t: string | undefined) => void; silent: boolean };
let listener: ((p: Pending) => void) | null = null;

type WebViewModule = typeof import('react-native-webview');
let wv: WebViewModule['WebView'] | null | undefined;
function webview() {
  if (wv !== undefined) return wv;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    wv = (require('react-native-webview') as WebViewModule).WebView;
  } catch {
    wv = null;
  }
  return wv;
}

export const captchaEnabled = () => !!SITE_KEY && Platform.OS !== 'web' && !!webview();

/** Captcha token'ı ister. Kapalıysa ya da çözülemezse undefined döner (istek yine denenir). */
export function requestCaptcha(opts?: { silent?: boolean }): Promise<string | undefined> {
  if (!captchaEnabled() || !listener) return Promise.resolve(undefined);
  return new Promise(resolve => listener!({ resolve, silent: !!opts?.silent }));
}

const html = (key: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script></head><body><div id="t"></div>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
var tries=0;(function init(){
  if(!window.turnstile){if(tries++<100)return setTimeout(init,150);return send({e:'load'})}
  turnstile.render('#t',{sitekey:${JSON.stringify(key)},theme:'light',callback:function(t){send({t:t})},
  'error-callback':function(c){send({e:String(c||'error')})},'expired-callback':function(){send({e:'expired'})},
  'timeout-callback':function(){send({e:'timeout'})},
  'before-interactive-callback':function(){send({ui:1})},'after-interactive-callback':function(){send({ui:0})}});
  send({r:1});
})();
</script></body></html>`;

type Phase = 'load' | 'ui' | 'err';

/** Kök düzene bir kere konur; token istendiğinde WebView'i açar, çözülünce kapatır. */
export function CaptchaHost() {
  const c = useColors();
  const WebView = webview();
  const [job, setJob] = useState<Pending | null>(null);
  const [phase, setPhase] = useState<Phase>('load');
  const [attempt, setAttempt] = useState(0);
  const queue = useRef<Pending[]>([]);

  const done = (token?: string) => {
    job?.resolve(token);
    setPhase('load');
    setAttempt(0);
    setJob(queue.current.shift() ?? null);
  };

  useEffect(() => {
    listener = p => setJob(cur => {
      if (cur) {
        queue.current.push(p);
        return cur;
      }
      return p;
    });
    return () => {
      listener = null;
    };
  }, []);

  // Yüklenme sınırı: arka planda 8 sn'de vazgeçilir; kişinin karşısındayken hata ekranı çıkar.
  useEffect(() => {
    if (!job || phase !== 'load') return;
    const t = setTimeout(() => (job.silent ? done(undefined) : setPhase('err')), job.silent ? SILENT_TIMEOUT_MS : LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, phase, attempt]);

  if (!job || !WebView || !SITE_KEY) return null;

  const fail = () => (job.silent ? done(undefined) : setPhase('err'));
  const web = (
    <WebView
      key={attempt}
      source={{ html: html(SITE_KEY), baseUrl: ORIGIN }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      androidLayerType="software"
      backgroundColor="#FFFFFF"
      style={st.web}
      onMessage={e => {
        try {
          const m = JSON.parse(e.nativeEvent.data) as { t?: string; e?: string; ui?: number };
          if (m.t) done(m.t);
          else if (m.e) fail();
          else if (m.ui != null) {
            // Arka plandaki istek sınav kutusu açmaz; vazgeçilir.
            if (m.ui && job.silent) done(undefined);
            else setPhase(m.ui ? 'ui' : 'load');
          }
        } catch {
          // Beklenmeyen mesaj yok sayılır.
        }
      }}
      onError={fail}
      onRenderProcessGone={fail}
    />
  );

  // Arka plan: görünmez, tıklanamaz.
  if (job.silent) {
    return (
      <View pointerEvents="none" style={st.ghost}>
        {web}
      </View>
    );
  }

  const title = phase === 'err' ? 'Doğrulama yapılamadı' : 'Robot olmadığını doğrula';
  const hint =
    phase === 'err'
      ? 'İnternetini kontrol edip tekrar dene. Olmazsa vazgeçip birkaç dakika sonra yeniden dene.'
      : phase === 'ui'
        ? 'Aşağıdaki kutuya dokun, doğrulama bitince devam edeceğiz.'
        : 'Kısa bir güvenlik kontrolü yapıyoruz. Genelde kendiliğinden biter, bir şey yapman gerekmez.';
  return (
    <View style={[StyleSheet.absoluteFill, st.dim]}>
      <View style={[st.card, { backgroundColor: c.surface }]}>
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, color: c.muted, textAlign: 'center' }}>{hint}</Text>
        {phase === 'err' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPhase('load');
              setAttempt(a => a + 1);
            }}
            style={[st.btn, { backgroundColor: c.accent }]}
          >
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.onAccent }}>Tekrar dene</Text>
          </Pressable>
        ) : (
          <View style={st.box}>
            {web}
            {phase === 'load' && <ActivityIndicator style={st.spin} color={c.muted} />}
          </View>
        )}
        <Text onPress={() => done(undefined)} accessibilityRole="button" style={{ fontFamily: fonts.bodyBold, color: c.muted, fontSize: 14, padding: 8 }}>
          Vazgeç
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { borderRadius: radius.card, padding: 18, width: '100%', maxWidth: 360, alignItems: 'center', gap: 10 },
  box: { width: 300, height: 75, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  web: { width: 300, height: 75, backgroundColor: '#FFFFFF' },
  spin: { position: 'absolute', alignSelf: 'center' },
  btn: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999 },
  // Görünmezken de tam boyutta durur (1x1'e küçülen WebView sınav kutusunu çizemiyor); sadece saydamdır.
  ghost: { position: 'absolute', left: 0, top: 0, width: 300, height: 75, opacity: 0.01 },
});
