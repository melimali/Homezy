import type { StockItem } from './types';

/**
 * Premium: buzdolabındakilerle tarif önerisi. İnternetsiz çalışır: elindeki ürünler (Var ya da Az)
 * bu küçük tarif listesiyle eşleştirilir; eksiği en az olan tarifler önce gelir.
 * Tuz, sıvı yağ, su ve baharat evde var sayılır, listede yok.
 */
export type Recipe = { name: string; emoji: string; min: number; needs: string[]; steps: string };

export const RECIPES: Recipe[] = [
  { name: 'Menemen', emoji: '🍳', min: 15, needs: ['yumurta', 'domates', 'biber'], steps: 'Biberi kavur, domatesi ekle, suyunu çekince yumurtaları kır ve karıştır.' },
  { name: 'Peynirli omlet', emoji: '🧀', min: 10, needs: ['yumurta', 'peynir'], steps: 'Yumurtaları çırp, tavaya dök, peyniri serp ve katla.' },
  { name: 'Çılbır', emoji: '🥚', min: 15, needs: ['yumurta', 'yoğurt', 'tereyağı'], steps: 'Yumurtaları suda poşe et, sarımsaklı yoğurdun üstüne koy, kızdırılmış tereyağı gezdir.' },
  { name: 'Tost', emoji: '🥪', min: 10, needs: ['ekmek', 'peynir'], steps: 'Ekmeğin arasına peynir koy, tost makinesinde ya da tavada kızart.' },
  { name: 'Yumurtalı ekmek', emoji: '🍞', min: 10, needs: ['ekmek', 'yumurta', 'süt'], steps: 'Ekmeği sütlü yumurtaya bulayıp tavada iki yüzünü kızart.' },
  { name: 'Mercimek çorbası', emoji: '🥣', min: 35, needs: ['mercimek', 'soğan', 'havuç'], steps: 'Soğan ve havucu kavur, mercimek ve suyu ekle, pişince blenderdan geçir.' },
  { name: 'Domates çorbası', emoji: '🍅', min: 25, needs: ['domates', 'un', 'süt'], steps: 'Unu yağda kavur, rendelenmiş domatesi ve suyu ekle, sonunda süt ekle.' },
  { name: 'Yoğurt çorbası', emoji: '🥣', min: 30, needs: ['yoğurt', 'pirinç', 'yumurta', 'un'], steps: 'Pirinci haşla; yoğurt, yumurta ve unu çırpıp ılıştırarak ekle, nane ile bitir.' },
  { name: 'Makarna', emoji: '🍝', min: 20, needs: ['makarna', 'domates'], steps: 'Makarnayı haşla, rendelenmiş domatesle sos yapıp karıştır.' },
  { name: 'Yoğurtlu makarna', emoji: '🍝', min: 20, needs: ['makarna', 'yoğurt'], steps: 'Makarnayı haşla, sarımsaklı yoğurt ve kızdırılmış yağ ile servis et.' },
  { name: 'Pirinç pilavı', emoji: '🍚', min: 25, needs: ['pirinç', 'tereyağı'], steps: 'Pirinci tereyağında kavur, sıcak suyu ekle, kısık ateşte demle.' },
  { name: 'Bulgur pilavı', emoji: '🍲', min: 25, needs: ['bulgur', 'soğan', 'domates'], steps: 'Soğanı kavur, domatesi ve bulguru ekle, suyunu çekene kadar pişir.' },
  { name: 'Patates yemeği', emoji: '🥔', min: 35, needs: ['patates', 'soğan', 'domates'], steps: 'Soğanı kavur, küp patates ve domatesi ekle, az suyla pişir.' },
  { name: 'Fırın patates', emoji: '🥔', min: 40, needs: ['patates'], steps: 'Patatesleri dilimle, yağ ve baharatla karıştırıp fırında kızart.' },
  { name: 'Tavuk sote', emoji: '🍗', min: 30, needs: ['tavuk', 'biber', 'soğan', 'domates'], steps: 'Tavuğu yüksek ateşte sotele, sebzeleri ekleyip birlikte pişir.' },
  { name: 'Fırında tavuk', emoji: '🍗', min: 50, needs: ['tavuk', 'patates'], steps: 'Tavuk ve patatesi baharatla harmanla, fırında kızarana kadar pişir.' },
  { name: 'Köfte', emoji: '🧆', min: 30, needs: ['kıyma', 'soğan', 'ekmek', 'yumurta'], steps: 'Hepsini yoğur, şekil ver, tavada ya da fırında pişir.' },
  { name: 'Kıymalı ıspanak', emoji: '🥬', min: 30, needs: ['ıspanak', 'kıyma', 'soğan'], steps: 'Soğan ve kıymayı kavur, doğranmış ıspanağı ekleyip söndür.' },
  { name: 'Sebze çorbası', emoji: '🥕', min: 30, needs: ['havuç', 'patates', 'soğan', 'kabak'], steps: 'Sebzeleri küp doğra, kavur, su ekleyip yumuşayınca püre yap.' },
  { name: 'Kabak mücver', emoji: '🥒', min: 30, needs: ['kabak', 'yumurta', 'un', 'peynir'], steps: 'Rendelenmiş kabağın suyunu sık, diğerleriyle karıştır, tavada kızart.' },
  { name: 'Çoban salata', emoji: '🥗', min: 10, needs: ['domates', 'salatalık', 'biber', 'soğan'], steps: 'Hepsini küçük doğra, limon ve zeytinyağıyla karıştır.' },
  { name: 'Cacık', emoji: '🥒', min: 10, needs: ['yoğurt', 'salatalık'], steps: 'Salatalığı rendele, sarımsaklı yoğurt ve suyla aç, nane serp.' },
  { name: 'Sütlaç', emoji: '🍮', min: 40, needs: ['süt', 'pirinç', 'şeker'], steps: 'Pirinci haşla, sütü ve şekeri ekleyip koyulaşana kadar karıştır.' },
  { name: 'Muzlu süt', emoji: '🍌', min: 5, needs: ['süt', 'muz'], steps: 'Muzu ve sütü blenderdan geçir.' },
  { name: 'Krep', emoji: '🥞', min: 20, needs: ['un', 'süt', 'yumurta'], steps: 'Akışkan bir hamur yap, ince ince tavada pişir.' },
  { name: 'Ton balıklı salata', emoji: '🐟', min: 10, needs: ['ton balığı', 'marul', 'mısır'], steps: 'Marulu doğra, ton balığı ve mısırla karıştır.' },
];

const norm = (s: string) => s.toLocaleLowerCase('tr-TR').trim();

/** Eldeki bir ürün bu malzemeyi karşılıyor mu ("Süt (1 L)" süt, "Kaşar peyniri" peynir sayılır). */
const has = (have: string[], need: string) => have.some(h => h.includes(need) || (h.length >= 4 && need.includes(h)));

export type RecipeMatch = { r: Recipe; missing: string[] };

/** Eldeki ürünlerle en uygun tarifler: önce eksiği az olanlar, sonra kullandığı ürün çok olanlar. */
export function suggestRecipes(stock: StockItem[], n = 3): RecipeMatch[] {
  const have = stock.filter(x => x.lvl !== 'yok').map(x => norm(x.name)).filter(Boolean);
  if (!have.length) return [];
  return RECIPES.map(r => ({ r, missing: r.needs.filter(x => !has(have, x)) }))
    .filter(m => m.missing.length < m.r.needs.length && m.missing.length <= 2)
    .sort((a, b) => a.missing.length - b.missing.length || b.r.needs.length - a.r.needs.length)
    .slice(0, n);
}

/** "domates" → "Domates" (alışveriş listesine eklerken). */
export const titleCase = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
