import { useBusy } from '@/components/BusyOverlay';
import { useRouter } from "@/lib/nav";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tx } from "@/i18n/runtime";
import { useAuth } from "@/auth/AuthProvider";
import { validEmail } from "@/auth/errors";
import { Btn, Card, Field, T, XBtn } from "@/components/ui";
import { cloudEnabled } from "@/lib/supabase";
import { legalUrl } from "@/lib/links";
import { useStore } from "@/store/AppStore";
import { ForceScheme, fonts, radius, useColors } from "@/theme";
import { Squish, useReduceMotion } from "@/components/motion";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

type Mode = "kayit" | "giris" | "sifre";

/** Hesap oluştur / giriş yap / şifremi unuttum. Tanıtımdan sonra ve Hesap ekranından açılır. */
export default function Giris() {
  const router = useRouter();
  const { status, signUp, signIn, resetPassword, continueAsGuest } = useAuth();
  const { state } = useStore();
  const fromApp = status === "guest";

  const [mode, setMode] = useState<Mode>("kayit");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useBusy(!!busy);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!validEmail(email)) return setError("Geçerli bir e-posta adresi yaz.");
    if (mode !== "sifre" && password.length < 8)
      return setError("Şifre en az 8 karakter olmalı.");
    if (mode === "kayit" && !name.trim())
      return setError("Sana nasıl seslenelim? Adını yaz.");
    setBusy(true);
    try {
      if (mode === "kayit") {
        const r = await signUp(name, email, password);
        if (!r.ok) setError(r.error);
        else if (r.needsConfirm) {
          setInfo(
            `${email.trim()} adresine bir onay bağlantısı gönderdik. Bağlantıya dokun, sonra buradan giriş yap.`,
          );
          setMode("giris");
          setPassword("");
        }
      } else if (mode === "giris") {
        const r = await signIn(email, password);
        if (!r.ok) setError(r.error);
        // Başarılıysa yönlendirme kendiliğinden olur; buluttaki ev useCloudSync ile gelir.
      } else {
        const r = await resetPassword(email);
        if (!r.ok) setError(r.error);
        else {
          setInfo("Şifre yenileme bağlantısını e-postana gönderdik.");
          setMode("giris");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    setBusy(true);
    setError(null);
    const r = await continueAsGuest();
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Doğrulama olmadı, tekrar dene.");
      return;
    }
    router.replace(state.setup ? "/" : "/kurulum");
  };

  const title =
    mode === "kayit"
      ? "Evin seni bekliyor 🏡"
      : mode === "giris"
        ? "Tekrar hoş geldin"
        : "Şifreni yenile";
  const lead =
    mode === "kayit"
      ? "Evin, rutinlerin ve üyeliğin hesabına kaydedilsin. Telefon değiştirsen de kaldığın yerden devam et."
      : mode === "giris"
        ? "Hesabına giriş yap, evin buluttan geri gelsin."
        : "E-posta adresini yaz, yenileme bağlantısını gönderelim.";

  return (
    <ForceScheme scheme="light">
      <StatusBar style="dark" />
      <GirisBody
        {...{ mode, name, setName, email, setEmail, password, setPassword, show, setShow, busy, error, info, title, lead, fromApp, switchTo, submit, guest }}
      />
    </ForceScheme>
  );
}

function GirisBody(p: {
  mode: Mode; name: string; setName: (v: string) => void; email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void; show: boolean; setShow: (f: (v: boolean) => boolean) => void;
  busy: boolean; error: string | null; info: string | null; title: string; lead: string; fromApp: boolean;
  switchTo: (m: Mode) => void; submit: () => void; guest: () => void;
}) {
  const { mode, name, setName, email, setEmail, password, setPassword, show, setShow, busy, error, info, title, lead, fromApp, switchTo, submit, guest } = p;
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useStore();
  const en = state.settings.language === "en";
  const heroH = insets.top + 226;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        <View style={[st.hero, { height: heroH, backgroundColor: c.glow }]}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="sky" x1="0" y1="0" x2="0.6" y2="1">
                <Stop offset="0" stopColor={c.peach} />
                <Stop offset="0.55" stopColor={c.glow} />
                <Stop offset="1" stopColor={c.roseSoft} />
              </LinearGradient>
              <RadialGradient id="sun" cx="0.82" cy="0.18" r="0.55">
                <Stop offset="0" stopColor="#FFF3D6" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#FFF3D6" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#sky)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#sun)" />
            <Circle cx="8%" cy="78%" r="70" fill={c.lavender} opacity={0.35} />
            <Circle cx="96%" cy="70%" r="54" fill={c.sage} opacity={0.4} />
            <Circle cx="30%" cy="10%" r="34" fill="#FFFFFF" opacity={0.25} />
          </Svg>
          <Sparkles />
          <View style={[st.head, { top: insets.top + 8 }]}>
            {fromApp && (
              <XBtn
                label="Kapat"
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(state.setup ? "/" : "/kurulum")
                }
              />
            )}
          </View>
          <View style={[st.heroText, { top: insets.top + 36 }]}>
            <Text style={[st.heroTitle, { color: c.ink }]}>{title}</Text>
            <Text style={[st.heroLead, { color: c.warm }]} numberOfLines={3}>{lead}</Text>
          </View>
        </View>

        <View style={st.body}>
          <MokaHop />

          {mode !== "sifre" && <Segment mode={mode} onChange={switchTo} />}

          <Card style={{ gap: 14, padding: 18, marginTop: mode === "sifre" ? 0 : -4 }}>
            {mode === "kayit" && (
              <Label text="Adın">
                <Field
                  value={name}
                  onChangeText={setName}
                  placeholder="Ör. Melih"
                  autoComplete="given-name"
                  textContentType="givenName"
                  returnKeyType="next"
                  style={st.field}
                />
                <Text style={st.ico}>🙂</Text>
              </Label>
            )}
            <Label text="E-posta">
              <Field
                value={email}
                onChangeText={setEmail}
                placeholder={en ? "name@example.com" : "ornek@eposta.com"}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                style={st.field}
              />
              <Text style={st.ico}>✉️</Text>
            </Label>
            {mode !== "sifre" && (
              <Label text="Şifre">
                <Field
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 8 karakter"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoComplete={mode === "kayit" ? "new-password" : "current-password"}
                  textContentType={mode === "kayit" ? "newPassword" : "password"}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                  style={[st.field, { paddingRight: 70 }]}
                />
                <Text style={st.ico}>🔒</Text>
                <Pressable
                  onPress={() => setShow((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={show ? "Şifreyi gizle" : "Şifreyi göster"}
                  style={st.pwToggle}
                >
                  <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: c.hi }}>
                    {tx(show ? "Gizle" : "Göster")}
                  </Text>
                </Pressable>
              </Label>
            )}

            {error && <Note color={c.late} bg={c.lateSoft} text={error} />}
            {info && <Note color={c.ok} bg={c.okSoft} text={info} />}

            <GradBtn
              label={
                busy
                  ? "Bekle…"
                  : mode === "kayit"
                    ? "Hesabı oluştur"
                    : mode === "giris"
                      ? "Giriş yap"
                      : "Bağlantıyı gönder"
              }
              onPress={submit}
              disabled={busy}
            />

            {(mode === "giris" || mode === "sifre") && (
              <Squish
                onPress={() => switchTo(mode === "giris" ? "sifre" : "giris")}
                accessibilityRole="button"
                style={{ alignSelf: "center", padding: 4 }}
              >
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: c.hi }}>
                  {tx(mode === "giris" ? "Şifremi unuttum" : "Girişe dön")}
                </Text>
              </Squish>
            )}
          </Card>

          {mode === "kayit" && (
            <Text style={[st.legal, { color: c.muted }]}>
              Hesap oluşturarak{" "}
              <Text
                style={{ color: c.ink, fontFamily: fonts.bodyBold }}
                onPress={() => Linking.openURL(legalUrl("terms", state.settings.language))}
              >
                Kullanım koşulları
              </Text>
              {en ? " and the " : "'nı ve "}
              <Text
                style={{ color: c.ink, fontFamily: fonts.bodyBold }}
                onPress={() => Linking.openURL(legalUrl("privacy", state.settings.language))}
              >
                Gizlilik politikası
              </Text>
              {en
                ? ", and confirm you are over 13 years old."
                : "'nı kabul etmiş, 13 yaşından büyük olduğunu onaylamış olursun."}
            </Text>
          )}

          {!fromApp && mode !== "sifre" && (
            <View style={{ gap: 8 }}>
              <Btn kind="soft" label="Hesapsız devam et" onPress={guest} disabled={busy} />
              <T v="small" style={{ textAlign: "center" }}>
                Verilerin sadece bu telefonda kalır. İstediğin zaman Hesabım
                sekmesinden hesap açabilirsin.
              </T>
            </View>
          )}

          {!cloudEnabled && (
            <T v="small" style={{ textAlign: "center" }}>
              Geliştirme sürümü: hesap sunucusu henüz bağlı değil (.env içinde
              Supabase adresi yok).
            </T>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Hero üstünde yanıp sönen parıltılar. Native sürücülü, "hareketi azalt" açıksa sabit. */
const SPARKS = [
  { l: "12%", t: 0.3, s: 14, d: 0 }, { l: "26%", t: 0.62, s: 10, d: 500 }, { l: "78%", t: 0.22, s: 16, d: 250 },
  { l: "90%", t: 0.5, s: 11, d: 750 }, { l: "58%", t: 0.12, s: 9, d: 1000 }, { l: "6%", t: 0.7, s: 12, d: 1250 },
];
function Sparkles() {
  const reduce = useReduceMotion();
  const [vals] = useState(() => SPARKS.map(() => new Animated.Value(reduce ? 0.8 : 0.15)));
  useEffect(() => {
    if (reduce) return;
    const anims = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(SPARKS[i].d),
          Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.15, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [reduce, vals]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {SPARKS.map((sp, i) => (
        <Animated.Text
          key={i}
          style={{
            position: "absolute", left: sp.l as `${number}%`, top: `${sp.t * 100}%`, fontSize: sp.s, color: "#FFFFFF",
            opacity: vals[i],
            transform: [{ scale: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
          }}
        >
          ✦
        </Animated.Text>
      ))}
    </View>
  );
}

/** Moka hero'dan taşıp kartın üstüne biner; açılışta zıplayarak gelir. */
function MokaHop() {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return;
    const a = Animated.spring(v, { toValue: 1, delay: 150, friction: 3.5, tension: 90, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [reduce, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.mokaWrap,
        {
          opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          ],
        },
      ]}
    >
      <Image
        source={require("../../assets/moka/moka_happy_clean.webp")}
        style={st.moka}
        resizeMode="contain"
        accessibilityLabel="Moka"
      />
    </Animated.View>
  );
}

/** Hesap oluştur / Giriş yap: kayan göstergeli segment. */
function Segment({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const c = useColors();
  const [w, setW] = useState(0);
  const [x] = useState(() => new Animated.Value(mode === "giris" ? 1 : 0));
  useEffect(() => {
    Animated.spring(x, { toValue: mode === "giris" ? 1 : 0, friction: 8, tension: 120, useNativeDriver: true }).start();
  }, [mode, x]);
  const half = Math.max(0, (w - 8) / 2);
  return (
    <View
      style={[st.seg, { backgroundColor: c.surface2 }]}
      accessibilityRole="tablist"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Animated.View
          style={[
            st.segThumb,
            { width: half, backgroundColor: c.accent, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }] },
          ]}
        />
      )}
      {(["kayit", "giris"] as const).map((m) => {
        const on = mode === m;
        return (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(m)}
            style={st.segBtn}
          >
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: on ? c.onAccent : c.muted }}>
              {tx(m === "kayit" ? "Hesap oluştur" : "Giriş yap")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Gradyanlı, parlak üst kenarlı ana buton. */
function GradBtn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Squish
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={tx(label)}
      scaleTo={0.95}
      sound="pop"
      style={[st.gradBtn, { shadowColor: c.accent, opacity: disabled ? 0.7 : 1 }]}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="btn" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6A9A7A" />
            <Stop offset="1" stopColor={c.accent} />
          </LinearGradient>
          <LinearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#btn)" />
        <Rect x="0" y="0" width="100%" height="55%" fill="url(#shine)" />
      </Svg>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: c.onAccent }}>{tx(label)}</Text>
    </Squish>
  );
}

function Label({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontFamily: fonts.bodyBlack,
          fontSize: 13.5,
          color: c.muted,
          marginLeft: 6,
        }}
      >
        {text}
      </Text>
      <View style={{ justifyContent: "center" }}>{children}</View>
    </View>
  );
}

function Note({
  text,
  color,
  bg,
}: {
  text: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: bg,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
      }}
    >
      <Text
        style={{
          color,
          fontFamily: fonts.bodyBold,
          fontSize: 13.5,
          lineHeight: 19,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: {
    overflow: "hidden",
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    alignItems: "center",
  },
  head: { position: "absolute", right: 16, zIndex: 3 },
  heroText: { position: "absolute", left: 24, right: 24, alignItems: "center", gap: 6 },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, textAlign: "center" },
  heroLead: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, textAlign: "center" },
  body: { paddingHorizontal: 20, gap: 18, width: "100%", maxWidth: 480, alignSelf: "center" },
  mokaWrap: { alignSelf: "center", marginTop: -74, marginBottom: -26, zIndex: 5, elevation: 12 },
  moka: { width: 150, height: 150 },
  seg: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segThumb: { position: "absolute", left: 4, top: 4, bottom: 4, borderRadius: radius.pill },
  segBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, paddingHorizontal: 8 },
  field: { flex: 0, alignSelf: "stretch", paddingVertical: 13, paddingLeft: 46 },
  ico: { position: "absolute", left: 16, fontSize: 17 },
  pwToggle: { position: "absolute", right: 16, paddingVertical: 8 },
  gradBtn: {
    height: 54, borderRadius: radius.pill, overflow: "hidden", alignItems: "center", justifyContent: "center",
    marginTop: 2, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 12, elevation: 6,
  },
  legal: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
});
