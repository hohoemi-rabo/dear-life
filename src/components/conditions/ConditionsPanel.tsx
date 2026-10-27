"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelImage } from "@/components/pixel/PixelImage";
import { CAR_LABELS, DISTRICTS, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel, type CarCount, type Housing } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { familyArtFor, landmarkAssetId } from "@/lib/pixel/assets";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";

type Chosen = Conditions & { district: DistrictId };
type Props = {
  conditions: Chosen;
  onConditionsChange: (update: Partial<Conditions>) => void;
};

// くらし（018）とカルテ（019）で使う、選んだ条件の表示と切り替え（F-04）。見た目はデザインイメージに合わせる（027）

// 選び直す：条件を持ったまま 01 えらぶ に戻る。カルテでは「条件を変える」と書く（デザインイメージ）
export function ChooseAgainLink({
  conditions,
  className = "",
  label = "選び直す",
  icon = "icon-refresh",
}: {
  conditions: Conditions;
  className?: string;
  label?: string;
  icon?: ComponentProps<typeof PixelIcon>["icon"];
}) {
  return (
    <Link
      href={conditionsHref(ERABU_PATH, conditions)}
      className={`inline-flex min-h-tap items-center gap-1 font-bold text-primary underline-offset-4 hover:underline ${className}`}
    >
      <PixelIcon icon={icon} size="sm" />
      {label}
    </Link>
  );
}

function carText(conditions: Conditions): string {
  return conditions.car === null ? "未選択" : CAR_LABELS[conditions.car];
}

const CHIP = "flex min-h-tap items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm";

// スマホ：地区の切り替え（F-04）と、選んだ条件のチップ。くらしは地区と家族だけ、カルテは住まい・車も出す（デザインイメージ）。
// action（カルテの「条件を変える」）を渡すと、地区の右に置き、ほかのチップは次の行に回す
export function ConditionChips({
  conditions,
  onConditionsChange,
  showAll = true,
  action,
}: Props & { showAll?: boolean; action?: ReactNode }) {
  return (
    <ul aria-label="選んだ条件" className="flex flex-wrap items-center gap-2">
      <li>
        <label className="flex min-h-tap items-center gap-1 rounded-full border-2 border-primary bg-surface pl-3 text-sm font-bold">
          <PixelIcon icon="icon-pin" size="sm" />
          <span className="sr-only">地区を切り替える</span>
          <select
            value={conditions.district}
            onChange={(event) => onConditionsChange({ district: event.target.value as DistrictId })}
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
      {action && (
        <>
          <li className="ml-auto">{action}</li>
          <li aria-hidden="true" className="basis-full" />
        </>
      )}
      <li className={CHIP}>
        <PixelIcon icon="icon-family" size="sm" />
        {familyLabel(conditions.adults, conditions.children)}
      </li>
      {showAll && (
        <>
          <li className={CHIP}>
            <PixelIcon icon="icon-house" size="sm" />
            {HOUSING_LABELS[conditions.housing]}
          </li>
          <li className={CHIP}>
            <PixelIcon icon="icon-car" size="sm" />車{carText(conditions)}
          </li>
        </>
      )}
    </ul>
  );
}

const NO_CAR = "none";

// PC：左の「わが家の設定」と「対象の4地区」（デザインイメージ PC版）。地区・住まい・車はその場で変えられる
export function ConditionsPanel({ conditions, onConditionsChange, chooseAgainLabel }: Props & { chooseAgainLabel?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="settings-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 id="settings-title" className="flex items-center gap-2 text-lg font-bold">
          <PixelIcon icon="icon-sprout" />
          わが家の設定
        </h2>
        <div className="flex justify-center">
          <PixelImage asset={familyArtFor(conditions.adults, conditions.children)} scale={3} decorative />
        </div>
        <p className="text-center font-bold">{familyLabel(conditions.adults, conditions.children)}</p>
        <div className="flex flex-col gap-2 text-sm">
          <SettingRow icon={<PixelIcon icon="icon-pin" />} label="地区">
            <SettingSelect
              label="地区"
              value={conditions.district}
              options={DISTRICTS.map(({ id, name }) => ({ value: id, label: name }))}
              onChange={(value) => onConditionsChange({ district: value as DistrictId })}
            />
          </SettingRow>
          <SettingRow icon={<PixelIcon icon="icon-house" />} label="住まい">
            <SettingSelect
              label="住まい"
              value={conditions.housing}
              options={(Object.keys(HOUSING_LABELS) as Housing[]).map((value) => ({ value, label: HOUSING_LABELS[value] }))}
              onChange={(value) => onConditionsChange({ housing: value as Housing })}
            />
          </SettingRow>
          <SettingRow icon={<PixelIcon icon="icon-car" />} label="車">
            <SettingSelect
              label="車"
              value={conditions.car === null ? NO_CAR : String(conditions.car)}
              options={[
                { value: NO_CAR, label: "未選択" },
                ...([0, 1, 2] as const).map((car) => ({ value: String(car), label: CAR_LABELS[car] })),
              ]}
              onChange={(value) => onConditionsChange({ car: value === NO_CAR ? null : (Number(value) as CarCount) })}
            />
          </SettingRow>
          <SettingRow icon={<PixelIcon icon="icon-sprout" />} label="大切にしたいこと">
            <p className="font-bold">
              {conditions.priorities.length === 0
                ? "なし"
                : conditions.priorities.map((priority) => KARTE_CARD_LABELS[priority]).join("・")}
            </p>
          </SettingRow>
        </div>
        <ChooseAgainLink conditions={conditions} className="self-center border-t border-dashed border-line pt-2" label={chooseAgainLabel} />
      </section>

      <section aria-labelledby="districts-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 id="districts-title" className="flex items-center gap-2 text-lg font-bold">
          <PixelIcon icon="icon-districts" />
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
                  onClick={() => onConditionsChange({ district: id })}
                  className={[
                    "flex min-h-tap w-full items-center gap-1 rounded-button border-2 px-1 py-2 text-left text-sm font-bold",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    selected ? "border-primary bg-primary-soft text-primary" : "border-line hover:border-ink-muted",
                  ].join(" ")}
                >
                  <PixelImage asset={landmarkAssetId(id, "spring")} scale={1} decorative className="shrink-0" />
                  <span className="whitespace-nowrap">{breakableName(name)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="flex items-center gap-2 rounded-card bg-kinari-deep px-4 py-3 text-sm">
        <PixelIcon icon="icon-sprout" />
        登録不要でお試しいただけます
      </p>
    </div>
  );
}

// 地区名は1行で出し、長い「中心市街地」だけ「中心／市街地」の間で折り返せるようにする（ボタンの幅が狭いため）
function breakableName(name: string): ReactNode {
  const at = name.indexOf("市街地");
  return at > 0 ? (
    <>
      {name.slice(0, at)}
      <wbr />
      {name.slice(at)}
    </>
  ) : (
    name
  );
}

function SettingRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[32px_4em_minmax(0,1fr)] items-center gap-x-2">
      {icon}
      <span className="text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function SettingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-tap w-full rounded-button border border-line bg-surface px-2 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
