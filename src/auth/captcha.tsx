import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fonts, useColors } from '@/theme';

/**
 * Supabase Auth'ta captcha (Cloudflare Turnstile) açıksa giriş, kayıt, şifre yenileme ve misafir
 * oturumu bir `captchaToken` ister. Site anahtarı `EXPO_PUBLIC_TURNSTILE_SITE_KEY`'dedir
 * (kurulum: docs/hesap.md). Anahtar yoksa, web'deyse ya da `react-native-webview` bu derlemede
 * yoksa token istenmez (undefined); Supabase'de captcha kapalıyken hiçbir şey değişmez.
 *
 * Turnstile "yönetilen" modda çalışır: çoğu kişide görünmez; sınav gerekirse küçük bir kutu çıkar.
 * Widget bir WebView içinde açılır; kökeni (baseUrl) Turnstile'daki izinli alan adlarından biri olmalı.
 */
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
const ORIGIN = process.env.EXPO_PUBLIC_TURNSTILE_ORIGIN || 'https://themeikai.com';
const TIMEOUT_MS = 8000; // Görünmez doğrulama en çok bu kadar bekler
const UI_TIMEOUT_MS = 25000; // Sınav kutusu açıksa kişiye bu kadar süre

type Pending = { resolve: (t: string | undefined) => void };
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
export function requestCaptcha(): Promise<string | undefined> {
  if (!captchaEnabled() || !listener) return Promise.resolve(undefined);
  return new Promise(resolve => listener!({ resolve }));
}

const html = (key: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:transparent}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script></head><body><div id="t"></div>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
var tries=0;(function init(){
  if(!window.turnstile){if(tries++<100)return setTimeout(init,150);return send({e:'load'})}
  turnstile.render('#t',{sitekey:${JSON.stringify(key)},callback:function(t){send({t:t})},
  'error-callback':function(c){send({e:String(c||'error')})},'expired-callback':function(){send({e:'expired'})},
  'before-interactive-callback':function(){send({ui:1})},'after-interactive-callback':function(){send({ui:0})}});
})();
</script></body></html>`;

/** Kök düzene bir kere konur; token istendiğinde WebView'i açar, çözülünce kapatır. */
export function CaptchaHost() {
  const c = useColors();
  const WebView = webview();
  const [job, setJob] = useState<Pending | null>(null);
  const [ui, setUi] = useState(false);
  const queue = useRef<Pending[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const done = (token?: string) => {
    if (timer.current) clearTimeout(timer.current);
    job?.resolve(token);
    setUi(false);
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

  useEffect(() => {
    if (!job) return;
    timer.current = setTimeout(() => done(undefined), ui ? UI_TIMEOUT_MS : TIMEOUT_MS); // Sınav açılınca süre yenilenir; ekran asla takılı kalmaz
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, ui]);

  if (!job || !WebView || !SITE_KEY) return null;
  return (
    <View pointerEvents={ui ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, ui && { backgroundColor: 'rgba(0,0,0,0.45)' }, st.center]}>
      <View style={[st.card, !ui && st.ghost, ui && { backgroundColor: c.surface }]}>
        {ui && <Text style={{ fontFamily: fonts.bodyBold, color: c.ink, fontSize: 14, marginBottom: 8 }}>Robot olmadığını doğrula</Text>}
        <WebView
          source={{ html: html(SITE_KEY), baseUrl: ORIGIN }}
          originWhitelist={['*']}
          javaScriptEnabled
          style={st.web}
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
          domStorageEnabled
          backgroundColor="transparent"
          onMessage={e => {
            try {
              const m = JSON.parse(e.nativeEvent.data) as { t?: string; e?: string; ui?: number };
              if (m.t) done(m.t);
              else if (m.e) done(undefined);
              else if (m.ui != null) setUi(!!m.ui);
            } catch {
              // Beklenmeyen mesaj yok sayılır.
            }
          }}
          onError={() => done(undefined)}
          onRenderProcessGone={() => done(undefined)}
        />
        {ui && (
          <Text onPress={() => done(undefined)} accessibilityRole="button" style={{ fontFamily: fonts.bodyBold, color: c.muted, fontSize: 13, textAlign: 'center', paddingTop: 8 }}>
            Vazgeç
          </Text>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 22, padding: 16, width: 330, alignItems: 'center' },
  // Görünmezken de tam boyutta durur (1x1'e küçülen WebView sınav kutusunu çizemiyor); sadece saydamdır.
  ghost: { opacity: 0.01, padding: 0, width: 300 },
  web: { width: 300, height: 80, backgroundColor: 'transparent' },
});
