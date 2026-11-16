-- Moka'nın kürk renkleri puanla alınır (docs/moka-oda-usta-plan.md §3.6). Orman bedava, tabloda yok.
-- Fiyatlar src/domain/items.ts FUR_PRICE ile aynı olmalı.
insert into public.play_items (id, price, premium) values
  ('kurk_kahve', 80, false), ('kurk_gri', 80, false),
  ('kurk_mavi', 120, false), ('kurk_turuncu', 120, false), ('kurk_pembe', 120, false),
  ('kurk_mor', 160, false), ('kurk_kirmizi', 160, false)
on conflict (id) do update set price = excluded.price, premium = excluded.premium;
