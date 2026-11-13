// カルテの防災の「災害の種類から避難先を探す」（040。見本 docs/design/karte-detail-disaster.png）の絞り込みと、
// 1か所ずつの「地図で見る」で開く Google マップの URL
import type { EvacuationHazard, EvacuationSite } from "../data/screen-data.ts";

// タブの並び（見本：洪水 → 土砂災害 → 地震。大規模な火事は使える場所のある地区だけ4つ目に出す）
export const DISASTER_TAB_HAZARDS: readonly EvacuationHazard[] = ["flood", "landslide", "earthquake", "large_fire"];

// 使える場所のない「大規模な火事」はタブにしない（「0か所」のタブを並べない。鼎だけにある）
export function disasterTabHazards(sites: readonly EvacuationSite[]): EvacuationHazard[] {
  return DISASTER_TAB_HAZARDS.filter((hazard) => hazard !== "large_fire" || sites.some((site) => site.hazards.includes(hazard)));
}

// 全角・半角や大文字・小文字の違い（施設名に「２階」「ＪＡ」がある）と空白を気にせずに探せるようにそろえる
function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

// その災害で使える避難場所のうち、名前か住所に入れた文字を含むもの。何も入れていなければ全部
export function findEvacuationSites(sites: readonly EvacuationSite[], hazard: EvacuationHazard, query: string): EvacuationSite[] {
  const words = normalize(query);
  return sites.filter(
    (site) => site.hazards.includes(hazard) && (words === "" || normalize(`${site.name}${site.address ?? ""}`).includes(words)),
  );
}

// Google マップで施設を探す URL（別のタブで開く）。送るのは市が公開している施設の名前と住所だけで、
// 選んだ地区や家族などの条件は送らない（F-02）。住所がなければ市の名前を添えて、ほかの町の同じ名前の施設に行かないようにする
const FALLBACK_AREA = "長野県飯田市";

export function googleMapsSearchHref(site: { name: string; address: string | null }): string {
  const query = `${site.name} ${site.address ?? FALLBACK_AREA}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
