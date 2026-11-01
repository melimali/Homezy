# Moka sahneleri

Arka plan + Moka stickerı birleşik görseller (`assets/scenes/`, 1280×960 JPEG). Eşleştirme `scripts/scenes.json`'da; bu tablo onun özeti.

## Yeni arka plan ekleme

1. Sayfa hâlinde geldiyse `scripts/scenes.json > sheets` altına satır, sütun ve kare adlarını yaz, sonra `python3 scripts/make-scenes.py slice <sayfa.png> <sayfa_adı>`. Tek görsel geldiyse `assets/arkaplan/<ad>.jpg` olarak koy.
2. Sayfadan kesilen kareler küçük (~200 px). `python3 scripts/make-scenes.py upscale <model_klasörü>` ile Real-ESRGAN (x4plus-anime, `pip install ncnn`, model dosyaları Real-ESRGAN GitHub sürümündeki ncnn zip'inin `models` klasörü) 4 kat büyütülür. Model yoksa Lanczos'la büyütür. 1024 px ve üstü tek görsel gelirse gerekmez.
3. `poses` ya da `rooms` içinde istediğin pozu yeni arka plana bağla.
4. `python3 scripts/make-scenes.py build`: sahneleri ve `src/constants/scenes.ts`'i yeniden üretir, eksik arka planları listeler.

İsteğe bağlı alanlar: `x` (Moka'nın yatay ortası, 0-1), `h` (boyu, sahne yüksekliğine oran, varsayılan 0,62), `flip` (aynala).

## Oda kartları

| Oda | Arka plan | Poz |
|---|---|---|
| salon | salon_kanepe | sipping |
| mutfak | mutfak_kose | dishes |
| yatak | yatak_odasi | blanket_coffee |
| banyo | banyo_lavabo | mirror |
| calisma | calisma_masasi | laptop |
| antre | antre_kapi | sweeping |
| balkon | balkon_kapi | watering |
| camasir | camasir_odasi | laundry_basket |
| cocuk | cocuk_odasi | birthday |

## Pozlar

| Poz | Arka plan |
|---|---|
| happy | salon_kanepe |
| sleepy | yatak_gece |
| shocked | yemek_odasi |
| analyzing | kitaplik |
| sassy | makyaj_masasi |
| party | salon_gece |
| cozy_plant | bitki_kosesi |
| chef | mutfak_ada |
| wink | kahve_kosesi |
| panicked | kiler |
| begging | kahve_bari |
| blanket | yagmurlu_pencere |
| sweeping | antre_kapi |
| dusting | salon_tv |
| laundry | yatak_odasi |
| mirror | banyo_lavabo |
| dishes | mutfak_kose |
| maintenance | merdiven_alti |
| plants | balkon_kapi |
| trash | antre_kapi2 |
| rest | pencere_sedir |
| checklist | calisma_masasi |
| vacuuming | salon_kanepe2 |
| sparkling_complete | salon_kanepe |
| cheers | kahve_kosesi |
| thumbs_up | salon_kanepe2 |
| love | pencere_sedir |
| nap | yatak_odasi |
| amazed | salon_tv |
| cookie | kahve_bari |
| music | minder_yatak |
| laptop | calisma_pencere |
| reading | kitaplik |
| sipping | kahve_kosesi |
| scarf | balkon_aksam |
| unimpressed | kedi_kutusu |
| plaid_coffee | okuma_koltugu |
| pizza | yemek_odasi |
| bubble_bath | banyo_kopuk |
| blanket_coffee | battaniye_cadiri |
| shower | banyo_dus |
| birthday | salon_gece |
| sunny_plant | bitki_kosesi |
| lazy_coffee | minder_yatak |
| baking | mutfak_ocak |
| scrubbing | banyo_tuvalet |
| handyman | merdiven |
| watering | balkon_aksam |
| laundry_basket | camasir_odasi |
| dustpan | koridor |
| spray_clean | mutfak_ada |
| trash_bag | koridor |
| todo | calisma_gece |
| iced_vacuum | okuma_koltugu |

## Eksik arka planlar

- `cocuk_odasi`: çocuk odası kartı için. Gelene kadar çocuk odası eski emojili kartla görünür.
- Kullanılmayan, ileride işe yarayabilecekler: `antre_konsol`, `kedi_kosesi`, `piknik`, `orman`, `kamp`, `yilbasi` (mevsim / tatil modu için).
