// Telefonda `localStorage`'ı expo-sqlite ile sağlar; Supabase oturumu da bunda saklanır.
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Hesaplar, ev verisinin bulut yedeği ve abonelik durumu Supabase'de.
 * Adres ve anahtar `.env` dosyasından gelir (bkz. docs/hesap.md). Anahtarlar girilmemişse
 * uygulama hesapsız çalışır: tanıtım ve giriş ekranları açılır, veriler sadece telefonda kalır.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: globalThis.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const cloudEnabled = supabase != null;

// Oturum jetonunu sadece uygulama ön plandayken yenile.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', s => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Küçük, telefona özel ayarlar (tanıtım görüldü mü, misafir mi). */
export const prefs = {
  get(k: string): string | null {
    try {
      return globalThis.localStorage?.getItem(`layfapp.${k}`) ?? null;
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v == null) globalThis.localStorage?.removeItem(`layfapp.${k}`);
      else globalThis.localStorage?.setItem(`layfapp.${k}`, v);
    } catch {
      // Depolama kapalıysa ayar bu oturumla sınırlı kalır.
    }
  },
};
