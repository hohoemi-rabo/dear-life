// 住所や町名の文字列を、町名→地区の対応表（town_district_map）に当てはめる（要件 5章-2・7.2）。
// 定期取得 Worker からも読み込むので、Node やブラウザの API・パスエイリアスに頼らない純粋な処理だけを置く

export type DistrictId = "kamisato" | "kanae" | "igara" | "chushin";

// town_district_map の1行のうち、振り分けに使う列
export type TownMapEntry = {
  townName: string;
  cityDistrict: string;
  // 対象4地区のときだけ入る。対象外（松尾・羽場など）は null で、集計から外す
  districtId: DistrictId | null;
};

const POSTAL_CODE = /^〒?\d{3}-?\d{4}/;
const CITY = "飯田市";

// 住所から都道府県・市・郵便番号・「大字」を外し、町名から始まる文字列にする。
// NFKC で全角英数字・全角スペースを半角にそろえる
export function stripAddressPrefix(address: string): string {
  let rest = address.normalize("NFKC").replace(/\s+/g, "");
  rest = rest.replace(POSTAL_CODE, "");
  const cityAt = rest.indexOf(CITY);
  if (cityAt >= 0) {
    rest = rest.slice(cityAt + CITY.length);
  } else {
    rest = rest.replace(/^長野県/, "");
  }
  return rest.replace(/^大字/, "");
}

// 同じ町名の書き方の違い（宮ノ上／宮の上、龍江／竜江、中央通り／中央通 など）を、比べるときだけそろえる
function toMatchKey(text: string): string {
  return text.replace(/ノ/g, "の").replace(/龍/g, "竜").replace(/嶋/g, "島").replace(/通り/g, "通");
}

// 番地・丁目・枝番の始まり。「三日市場」「二本松」のように町名に漢数字があるので、漢数字は丁目・番の前だけ見る。
// 漢数字の「二」がカタカナの「ニ」で書かれていることがある（市「指定緊急避難場所一覧」の「追手町ニ丁目」）
const BLOCK_NUMBER_START = /\d|[一二三四五六七八九十ニ]*(?:丁目|番)|-/;

// 対応表にない町名を記録するときの名前。番地より前を町名とみなす
export function townNameForRecord(address: string): string {
  const rest = stripAddressPrefix(address);
  const match = BLOCK_NUMBER_START.exec(rest);
  return match ? rest.slice(0, match.index) : rest;
}

// 対応表から、住所を町名に当てはめる関数を作る。
// 「鼎中平」→「鼎」、「松尾代田」→「松尾」のように、対応表の町名が細かい町名をまとめていることがあるので、
// 町名の区切りを推測せず、住所の先頭と一致するいちばん長い町名を選ぶ（「松尾町」は「松尾」より先に当たる）
export function createTownResolver(entries: readonly TownMapEntry[]) {
  const candidates = entries
    .map((entry) => ({ entry, key: toMatchKey(entry.townName) }))
    .sort((a, b) => b.key.length - a.key.length);

  return function resolveTown(address: string): TownMapEntry | null {
    const key = toMatchKey(stripAddressPrefix(address));
    if (key === "") return null;
    return candidates.find((candidate) => key.startsWith(candidate.key))?.entry ?? null;
  };
}
