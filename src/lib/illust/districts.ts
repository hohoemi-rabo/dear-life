// えらぶ 01 の飯田市全体の絵（erabu-iida-overview）に出す4地区の札の位置（028）。
// まさゆきさんが地区の境目を描いた assets/illust/iida-districts-guide.png の、囲った範囲の真ん中に置く。
// 囲いの外（左下の隅・上の帯）は4地区の外として扱う。値は絵の幅・高さに対する割合（％）
import type { DistrictId } from "../town-district/resolve.ts";

export const DISTRICT_LABEL_POSITIONS: Record<DistrictId, { x: number; y: number; vertical?: boolean }> = {
  // 赤の線の右下（リニアの駅のあたりから手前の田畑まで）
  kamisato: { x: 70, y: 72 },
  // オレンジの線で囲った中
  kanae: { x: 26, y: 52 },
  // 紫の線に沿った左の端。見本どおり縦書き
  igara: { x: 6, y: 40, vertical: true },
  // 青の線の右上（ビルの集まるあたり）
  chushin: { x: 60, y: 34 },
};
