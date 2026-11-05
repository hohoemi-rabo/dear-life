import { useEffect, useRef, useState } from "react";
import type { DistrictId } from "@/lib/town-district/resolve";

// tailwind.config.ts の district-notice・card-glow の長さとそろえる
const DISTRICT_NOTICE_MS = 1500;
const CARD_GLOW_MS = 900;

// 地区が切りかわったことを伝える（2026-11-05 まさゆきさん）：パネルを約1.5秒出し、消えたらカードを一度だけ強調する。
// ページを開いたときは出さない。続けて切りかえたら、前のタイマーを止めて数え直す。
// 消すのはタイマーで行う（「動きを減らす」ではアニメーションが動かないので、その終わりを待てない）
export function useDistrictSwitch(district: DistrictId | null): { noticeDistrict: DistrictId | null; cardsHighlighted: boolean } {
  const previous = useRef(district);
  const [noticeDistrict, setNoticeDistrict] = useState<DistrictId | null>(null);
  const [cardsHighlighted, setCardsHighlighted] = useState(false);

  useEffect(() => {
    const from = previous.current;
    previous.current = district;
    if (from === null || district === null || from === district) return;

    setCardsHighlighted(false);
    setNoticeDistrict(district);
    const hideNotice = setTimeout(() => {
      setNoticeDistrict(null);
      setCardsHighlighted(true);
    }, DISTRICT_NOTICE_MS);
    const endGlow = setTimeout(() => setCardsHighlighted(false), DISTRICT_NOTICE_MS + CARD_GLOW_MS);
    return () => {
      clearTimeout(hideNotice);
      clearTimeout(endGlow);
    };
  }, [district]);

  return { noticeDistrict, cardsHighlighted };
}
