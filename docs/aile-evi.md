# Aile evi (çift / aile / ev arkadaşı)

Kısa cevap: **yeni sunucu gerekmez.** Mevcut Supabase projesi yeter. Telefondaki veri önce yerel kalır; paylaşılan kısım Supabase'de durur.

## Ne var, ne eklendi

| Parça | Durum | Nerede |
|---|---|---|
| Ev paylaşımı, 6 haneli davet kodu, en çok 6 kişi, çıkarma | Var | `…_premium.sql`, `src/family/FamilyProvider.tsx`, `src/app/aile.tsx` |
| "Kim yapacak" 👤 ile iş bölüşümü | Var | oda ekranı |
| Çakışma çözümü (iki kişi aynı anda değiştirirse) | Var | `family_save(p_state, p_base)`, `mergeHome()` |
| **Premium'un üyelere yayılması** | Yeni | `…_aile_evi.sql` (`is_premium`), `PurchasesProvider.setFamilyPremium` |
| **Ortak hedefler** (birlikte kitap, spor…) | Yeni | `…_aile_evi.sql` (`family_goals`), aile ekranı |
| Anında güncelleme (Realtime) | Sonraki adım | aşağıda |

## Veri modeli (Supabase)

- `families` (ev sahibi başına bir satır, `code`, `home_id`)
- `family_members` (üye → ev sahibi, tek aile kuralı)
- `shared_homes` (ev durumu JSON, `updated_at` sürüm gibi kullanılır)
- `family_goals` (başlık, emoji, hedef sayı, birim, kimin eklediği)
- `family_goal_logs` (kim, kaç birim, ne zaman; toplam ve kişi başı buradan hesaplanır)

## Güvenlik (RLS)

Bütün tablolarda RLS açık, **hiç politika yok**: istemci tablolara doğrudan erişemez. Okuma ve yazma sadece `security definer` fonksiyonlarla olur (`family_*`, `goals_list`, `goal_add`, `goal_log`, `goal_delete`). Her fonksiyon önce `family_of(auth.uid())` ile çağıranın hangi aileye ait olduğuna bakar; başka ailenin verisine ulaşılamaz.

Kurallar:
- Hedef eklemek, ilerleme yazmak: ailedeki herkes (ev sahibinin Premium'u sürüyorsa).
- Hedefi silmek: ekleyen kişi ya da ev sahibi.
- En çok 20 açık hedef, bir seferde en çok 100 birim ilerleme.

## Davet akışı

1. Ev sahibi (kendi Premium'u olan) **Hesabım > Aile paylaşımı > Davet kodu oluştur**.
2. "Kodu gönder" ile WhatsApp vb. paylaşılır (mesaj hazır).
3. Davetli uygulamayı kurar, hesap açar, **Bir aileye katıl** alanına kodu yazar. Katılanın Premium'u olmasına gerek yok.
4. Paylaşılan ev açılır; kendi evi **Evlerim**'de saklı kalır.
5. Ev sahibi Premium'u bitirirse paylaşım durur, herkesin telefonunda kopya kalır; Premium dönünce devam eder.

## Premium kuralları

- **Ev kurmak** için kişinin **kendi** aboneliği gerekir (`is_premium_own`). Üyelikten gelen Premium ile yeni aile kurulamaz, yoksa zincirleme paylaşım olurdu.
- **Üye**, ev sahibi Premium olduğu sürece Premium avantajlarını alır: günde 50 tarama, 1,5 kat puan, reklamsızlık, Premium eşyalar (`is_premium` ev sahibinin aboneliğine bakar). Ayrılınca ya da çıkarılınca avantaj biter.
- Uygulamada üyenin `premium.active` değeri `true` olur ve `viaFamily` işaretlenir; abonelik yönetimi ekranında kendi aboneliği yok görünür.
- Gelir etkisi: bir abonelik en çok 6 kişiyi kapsar. Fiyat/gelir hesabı için `docs/premium.md`'ye bakılacak (6 kişilik kullanım maliyeti: tarama hakkı kişi başı ayrı sayılır).

## Ekranlar

1. **Aile paylaşımı** (`/aile`): davet kodu, evdekiler, **Ortak hedefler** kartı (ilerleme çubuğu, kişi başı sayı, "+1 ekle", hazır öneriler, tamamlanınca 🏆).
2. **Bugün** sekmesi: ileride "ortak hedef" satırı (sonraki adım).
3. **Ev** ekranı: ileride aile üyelerinin avatarları ve "kim ne yaptı" akışı (sonraki adım).

## Kurulum (Melih yapacak)

1. Supabase > SQL Editor: önce yoksa `20261021100000_premium.sql`, sonra **`20261031000000_aile_evi.sql`** dosyasını çalıştır. Çalıştırılmazsa uygulama çökmez: hedefler boş kalır, Premium paylaşımı sadece telefonda görünür.
2. Uygulamayı yeniden derlemek gerekmez (sadece JS).

## Adımlar

1. ✅ Mevcut paylaşım + iş bölüşümü
2. ✅ SQL: `is_premium` aileye yayılır, ortak hedef tabloları ve fonksiyonları
3. ✅ JS: `FamilyProvider` hedefler + Premium yansıtma, aile ekranında hedef kartı
4. ⏳ Realtime: `family_goals`, `family_goal_logs`, `shared_homes` için `supabase_realtime` yayınına ekle, üyelere `select` politikası ver (`family_of(auth.uid()) = owner_id`), 30 sn yoklamayı abonelikle değiştir
5. ⏳ Bugün sekmesinde ortak hedef, Ev ekranında "kim ne yaptı" akışı
6. ⏳ Bildirim: biri hedefe ilerleme yazınca diğerlerine yerel hatırlatma (sunucu push gerektirir, ilk sürümde yok)
7. ⏳ Çift modu: 2 kişilik aileye özel kısa kurulum ve "birlikte" teması
