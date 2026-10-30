"use client";

import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DISTRICTS } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";

// 条件の「変更」（スマホの条件の札・PC の「選び直す」）で開くシート。地区はこの場で切り替え（F-04）、
// ほかの条件は 01 えらぶ に戻って選び直す（条件は URL に載せたまま）
export function ConditionsSheet({
  open,
  onClose,
  conditions,
  onDistrictChange,
}: {
  open: boolean;
  onClose: () => void;
  conditions: Conditions & { district: DistrictId };
  onDistrictChange: (district: DistrictId) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="地区を切り替える">
      <ul className="grid grid-cols-2 gap-2">
        {DISTRICTS.map(({ id, name }) => {
          const selected = id === conditions.district;
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onDistrictChange(id);
                  onClose();
                }}
                className={[
                  "flex min-h-tap w-full items-center justify-center rounded-button border-2 px-3 font-bold transition duration-150 active:scale-[0.98]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  selected ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface hover:border-ink-muted",
                ].join(" ")}
              >
                {name}
              </button>
            </li>
          );
        })}
      </ul>
      <Link
        href={conditionsHref(ERABU_PATH, conditions)}
        className="inline-flex min-h-tap items-center justify-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline"
      >
        家族・住まい・車を選び直す
        <span aria-hidden="true">→</span>
      </Link>
    </BottomSheet>
  );
}
