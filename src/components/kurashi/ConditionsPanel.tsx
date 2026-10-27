"use client";

import Link from "next/link";
import { PixelImage } from "@/components/pixel/PixelImage";
import { CAR_LABELS, DISTRICTS, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { familyArtFor, landmarkAssetId } from "@/lib/pixel/assets";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";

type Props = {
  conditions: Conditions & { district: DistrictId };
  onDistrictChange: (district: DistrictId) => void;
};

const LINK_CLASS =
  "inline-flex min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline";

// 選び直す：条件を持ったまま 01 えらぶ に戻る
export function ChooseAgainLink({ conditions, className = "" }: { conditions: Conditions; className?: string }) {
  return (
    <Link href={conditionsHref(ERABU_PATH, conditions)} className={`${LINK_CLASS} ${className}`}>
      選び直す
    </Link>
  );
}

function carText(conditions: Conditions): string {
  return conditions.car === null ? "未選択" : CAR_LABELS[conditions.car];
}

// スマホ：地区の切り替え（F-04）と、選んだ条件のチップ
export function ConditionChips({ conditions, onDistrictChange }: Props) {
  const chip = "rounded-full border border-line bg-surface px-3 py-1 text-sm";
  return (
    <ul aria-label="選んだ条件" className="flex flex-wrap items-center gap-2">
      <li>
        <label className="flex min-h-tap items-center gap-1 rounded-full border-2 border-primary bg-surface pl-3 text-sm font-bold">
          <span className="sr-only">地区を切り替える</span>
          <select
            value={conditions.district}
            onChange={(event) => onDistrictChange(event.target.value as DistrictId)}
            className="min-h-tap rounded-full bg-transparent pr-2 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {DISTRICTS.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </li>
      <li className={chip}>{familyLabel(conditions.adults, conditions.children)}</li>
      <li className={chip}>{HOUSING_LABELS[conditions.housing]}</li>
      <li className={chip}>車{carText(conditions)}</li>
    </ul>
  );
}

// PC：左の「わが家の設定」と「対象の4地区」（デザインイメージ PC版）
export function ConditionsPanel({ conditions, onDistrictChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="settings-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 id="settings-title" className="text-lg font-bold">
          わが家の設定
        </h2>
        <div className="flex justify-center">
          <PixelImage asset={familyArtFor(conditions.adults, conditions.children)} scale={3} decorative />
        </div>
        <p className="text-center font-bold">{familyLabel(conditions.adults, conditions.children)}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-ink-muted">住まい</dt>
          <dd className="font-bold">{HOUSING_LABELS[conditions.housing]}</dd>
          <dt className="text-ink-muted">車</dt>
          <dd className="font-bold">{carText(conditions)}</dd>
          <dt className="text-ink-muted">大切にしたいこと</dt>
          <dd className="font-bold">
            {conditions.priorities.length === 0
              ? "なし"
              : conditions.priorities.map((priority) => KARTE_CARD_LABELS[priority]).join("・")}
          </dd>
        </dl>
        <ChooseAgainLink conditions={conditions} className="self-center" />
      </section>

      <section aria-labelledby="districts-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 id="districts-title" className="text-lg font-bold">
          対象の4地区
        </h2>
        <ul className="grid grid-cols-2 gap-2">
          {DISTRICTS.map(({ id, name }) => {
            const selected = id === conditions.district;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onDistrictChange(id)}
                  className={[
                    "flex min-h-tap w-full flex-col items-center gap-1 rounded-button border-2 px-1 py-2 text-sm font-bold",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    selected ? "border-primary bg-primary-soft text-primary" : "border-line hover:border-ink-muted",
                  ].join(" ")}
                >
                  <PixelImage asset={landmarkAssetId(id, "spring")} scale={1} decorative />
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
