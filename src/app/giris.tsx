import { useRouter } from "@/lib/nav";
import { useState } from "react";
import { MokaReact } from "@/components/MokaReact";
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

import { dateLocale, tx } from "@/i18n/runtime";
import { useAuth } from "@/auth/AuthProvider";
import { validEmail } from "@/auth/errors";
import { Btn, Card, Field, T, XBtn } from "@/components/ui";
import { cloudEnabled } from "@/lib/supabase";
import { legalUrl } from "@/lib/links";
import { useStore } from "@/store/AppStore";
import { brand, fonts, radius, useColors } from "@/theme";
import { Appear, Squish } from "@/components/motion";

type Mode = "kayit" | "giris" | "sifre";

/** Hesap oluştur / giriş yap / şifremi unuttum. Tanıtımdan sonra ve Hesap ekranından açılır. */
export default function Giris() {
  const c = useColors();
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          st.wrap,
          { paddingTop: insets.top + 10, paddingBottom: 20 },
        ]}
      >
        <View style={st.head}>
          <View style={[st.logoPill, { backgroundColor: brand.mint }]}>
            <Image
              source={require("../../assets/logo-yatay.png")}
              style={st.wordmark}
              resizeMode="contain"
              accessibilityLabel="Homezy"
            />
          </View>
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

        <View style={st.hero}>
          <View style={[st.mokaWrap, { backgroundColor: c.surface2 }]}>
            <MokaReact anim="happy" size={84} />
          </View>
          <Text style={[st.heroEyebrow, { color: c.muted }]}>
            {tx(
              mode === "sifre" ? "Şifremi unuttum" : "Hesap",
            ).toLocaleUpperCase(dateLocale())}
          </Text>
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
                    style={{
                      fontFamily: fonts.bodyBlack,
                      fontSize: 14,
                      color: on ? c.onAccent : c.muted,
                    }}
                  >
                    {m === "kayit" ? "Hesap oluştur" : "Giriş yap"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Appear index={1}>
        <Card style={{ gap: 10 }}>
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
              placeholder={
                state.settings.language === "en"
                  ? "name@example.com"
                  : "ornek@eposta.com"
              }
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
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Field
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 8 karakter"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoComplete={
                    mode === "kayit" ? "new-password" : "current-password"
                  }
                  textContentType={
                    mode === "kayit" ? "newPassword" : "password"
                  }
                  onSubmitEditing={submit}
                  returnKeyType="go"
                />
                <Btn
                  small
                  label={show ? "Gizle" : "Göster"}
                  onPress={() => setShow((v) => !v)}
                  accessibilityLabel={show ? "Şifreyi gizle" : "Şifreyi göster"}
                />
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
            style={{ marginTop: 4 }}
          />

          {mode === "giris" && (
            <Squish
              onPress={() => switchTo("sifre")}
              accessibilityRole="button"
              style={{ alignSelf: "center", padding: 4 }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: 13.5,
                  color: c.hi,
                }}
              >
                Şifremi unuttum
              </Text>
            </Squish>
          )}
          {mode === "sifre" && (
            <Squish
              onPress={() => switchTo("giris")}
              accessibilityRole="button"
              style={{ alignSelf: "center", padding: 4 }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: 13.5,
                  color: c.hi,
                }}
              >
                Girişe dön
              </Text>
            </Squish>
          )}
        </Card>
        </Appear>

        {mode === "kayit" && (
          <Text style={[st.legal, { color: c.muted }]}>
            Hesap oluşturarak{" "}
            <Text
              style={{ color: c.ink, fontFamily: fonts.bodyBold }}
              onPress={() =>
                Linking.openURL(legalUrl("terms", state.settings.language))
              }
            >
              Kullanım koşulları
            </Text>
            {state.settings.language === "en" ? " and the " : "'nı ve "}
            <Text
              style={{ color: c.ink, fontFamily: fonts.bodyBold }}
              onPress={() =>
                Linking.openURL(legalUrl("privacy", state.settings.language))
              }
            >
              Gizlilik politikası
            </Text>
            {state.settings.language === "en"
              ? ", and confirm you are over 13 years old."
              : "'nı kabul etmiş, 13 yaşından büyük olduğunu onaylamış olursun."}
          </Text>
        )}

        {!cloudEnabled && (
          <T v="small" style={{ textAlign: "center" }}>
            Geliştirme sürümü: hesap sunucusu henüz bağlı değil (.env içinde
            Supabase adresi yok).
          </T>
        )}
      </ScrollView>
      {!fromApp && mode !== "sifre" && (
        <View
          style={{
            gap: 6,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: insets.bottom + 10,
            backgroundColor: c.bg,
            borderTopWidth: 1,
            borderTopColor: c.line,
          }}
        >
          <Btn
            kind="soft"
            label="Hesapsız devam et"
            onPress={guest}
            disabled={busy}
          />
          {error && <Note color={c.late} bg={c.lateSoft} text={error} />}
          <T v="small" style={{ textAlign: "center" }}>
            Verilerin sadece bu telefonda kalır. İstediğin zaman Hesabım
            sekmesinden hesap açabilirsin.
          </T>
        </View>
      )}
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
    paddingHorizontal: 18,
    gap: 16,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  hero: { alignItems: "center", gap: 6 },
  mokaWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 6,
  },
  heroEyebrow: { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1.4, textAlign: "center" },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, textAlign: "center" },
  heroLead: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 6 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wordmark: { width: 96, height: 32 },
  seg: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  field: { flex: 0, alignSelf: "stretch", paddingVertical: 11 },
  legal: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  or: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: 1.5 },
});
