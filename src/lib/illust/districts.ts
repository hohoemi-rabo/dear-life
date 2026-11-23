// えらぶ 01 の飯田市全体の絵（erabu-iida-overview）に出す地区の札の位置（028）。選んだ地区の札だけを立てる（050）。
// 2026-11-23 に絵を差しかえたので、まさゆきさんが新しい絵に付けた紫の〇の真ん中に置き直した。
// 伊賀良だけは前の絵のときと同じ位置・縦書きのまま（まさゆきさんの希望）。値は絵の幅・高さに対する割合（％）
import type { DistrictId } from "../town-district/resolve.ts";

export const DISTRICT_LABEL_POSITIONS: Record<DistrictId, { x: number; y: number; vertical?: boolean }> = {
  // 神社の石段の左、田畑のあたり
  kamisato: { x: 57, y: 72.6 },
  // 体育館の左上、通り沿い
  kanae: { x: 31.1, y: 45.7 },
  // 左の端。見本どおり縦書き
  igara: { x: 6, y: 40, vertical: true },
  // ビルの集まる真ん中
  chushin: { x: 50.1, y: 38.9 },
};
