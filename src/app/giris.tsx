import { useRouter } from "@/lib/nav";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
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
import { Appear, Squish } from "@/components/motion";

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
      ? "Hesabını oluştur"
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
      {/* Zemin krem: durum çubuğu simgeleri koyu olmalı (sistem koyu temadayken beyaz kalıp görünmüyordu). */}
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          st.wrap,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <View style={st.head}>
          {fromApp ? (
            <XBtn
              label="Kapat"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace(state.setup ? "/" : "/kurulum")
              }
            />
          ) : (
            <View style={{ height: 32 }} />
          )}
        </View>

        <View style={st.hero}>
          <Image
            source={require("../../assets/moka/moka_happy_clean.webp")}
            style={st.moka}
            resizeMode="contain"
            accessibilityLabel="Moka"
          />
          <Text style={[st.heroTitle, { color: c.ink }]}>{title}</Text>
          <Text style={[st.heroLead, { color: c.muted }]}>{lead}</Text>
        </View>

        {mode !== "sifre" && (
          <View
            style={[st.seg, { backgroundColor: c.surface2 }]}
            accessibilityRole="tablist"
          >
            {(["kayit", "giris"] as const).map((m) => {
              const on = mode === m;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => switchTo(m)}
                  style={[st.segBtn, on && { backgroundColor: c.accent }]}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bodyBlack,
                      fontSize: 14,
                      color: on ? c.onAccent : c.muted,
                    }}
                  >
                    {tx(m === "kayit" ? "Hesap oluştur" : "Giriş yap")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Card style={{ gap: 14, padding: 18 }}>
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
          </Label>
          {mode !== "sifre" && (
            <Label text="Şifre">
              <View style={st.pwRow}>
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
                  style={[st.field, { flex: 1, paddingRight: 64 }]}
                />
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
              </View>
            </Label>
          )}

          {error && <Note color={c.late} bg={c.lateSoft} text={error} />}
          {info && <Note color={c.ok} bg={c.okSoft} text={info} />}

          <Btn
            kind="primary"
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
            style={{ marginTop: 2 }}
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
      </ScrollView>
    </KeyboardAvoidingView>
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
      {children}
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
  wrap: {
    paddingHorizontal: 20,
    gap: 18,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", minHeight: 32 },
  hero: { alignItems: "center", gap: 6 },
  moka: { width: 150, height: 150, marginBottom: 2 },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, textAlign: "center" },
  heroLead: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, textAlign: "center", paddingHorizontal: 4 },
  seg: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, paddingHorizontal: 8, borderRadius: radius.pill },
  field: { flex: 0, alignSelf: "stretch", paddingVertical: 13 },
  pwRow: { justifyContent: "center" },
  pwToggle: { position: "absolute", right: 16, paddingVertical: 8 },
  legal: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
});
