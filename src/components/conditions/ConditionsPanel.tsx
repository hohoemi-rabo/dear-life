"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { CAR_LABELS, DISTRICTS, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel, type CarCount, type Housing } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { FamilyRow } from "@/components/illust/FamilyRow";
import {
  DISTRICT_PICTURES,
  SETTINGS_ICON_WIDTHS,
  illustPictureSrc,
  settingsIconSrc,
  settingsIconSrcSet,
  type SettingsIconId,
} from "@/lib/illust/assets";
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

// スマホ：家族の絵と選んだ条件の帯（028 見本 karte-mobile.png）。地区はその場で切りかえられる（F-04）。
// action（「条件を変える」）は右に置く
export function ConditionsStrip({ conditions, onConditionsChange, action }: Props & { action?: ReactNode }) {
  return (
    <section aria-label="選んだ条件" className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card">
      <FamilyRow conditions={conditions} fatherHeight={44} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col text-[13px] leading-snug">
        <label className="inline-flex items-center self-start">
          <span className="sr-only">地区を切り替える</span>
          <select
            value={conditions.district}
            onChange={(event) => onConditionsChange({ district: event.target.value as DistrictId })}
            className="min-h-tap rounded-button bg-transparent pr-1 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {DISTRICTS.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="font-bold">{familyLabel(conditions)}</p>
        <p>
          {HOUSING_LABELS[conditions.housing]} / 車{carText(conditions)}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

const NO_CAR = "none";

// PC：左の「わが家の設定」と「対象の4地区」（デザインイメージ PC版）。地区・住まい・車はその場で変えられる
export function ConditionsPanel({ conditions, onConditionsChange, chooseAgainLabel }: Props & { chooseAgainLabel?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="settings-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 id="settings-title" className="flex items-center gap-2 text-lg font-bold">
          <SettingsIcon icon="settings" />
          わが家の設定
        </h2>
        {/* 家族はくらしの「わが家」と同じ人物（028 まさゆきさん）。スマホではこの欄を隠しているので、見えるまで読まない */}
        <FamilyRow conditions={conditions} fatherHeight={72} lazy />
        <p className="text-center font-bold">{familyLabel(conditions)}</p>
        <div className="flex flex-col gap-2 text-sm">
          <SettingRow icon={<SettingsIcon icon="district" />} label="地区">
            <SettingSelect
              label="地区"
              value={conditions.district}
              options={DISTRICTS.map(({ id, name }) => ({ value: id, label: name }))}
              onChange={(value) => onConditionsChange({ district: value as DistrictId })}
            />
          </SettingRow>
          <SettingRow icon={<SettingsIcon icon="housing" />} label="住まい">
            <SettingSelect
              label="住まい"
              value={conditions.housing}
              options={(Object.keys(HOUSING_LABELS) as Housing[]).map((value) => ({ value, label: HOUSING_LABELS[value] }))}
              onChange={(value) => onConditionsChange({ housing: value as Housing })}
            />
          </SettingRow>
          <SettingRow icon={<SettingsIcon icon="car" />} label="車">
            <SettingSelect
              label="車"
              value={conditions.car === null ? NO_CAR : String(conditions.car)}
              // 車は必須の質問（2026-11-06）なので「未選択」は選ばせない。c のない古い URL で開いたときだけ、選べない「選んでください」を出す
              options={[
                ...(conditions.car === null ? [{ value: NO_CAR, label: "選んでください", disabled: true }] : []),
                ...([0, 1, 2] as const).map((car) => ({ value: String(car), label: CAR_LABELS[car] })),
              ]}
              onChange={(value) => onConditionsChange({ car: Number(value) as CarCount })}
            />
          </SettingRow>
          <SettingRow icon={<SettingsIcon icon="priorities" />} label="大切にしたいこと">
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
          <SettingsIcon icon="districts" />
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
                  <DistrictThumb district={id} />
                  <span className="whitespace-nowrap">{breakableName(name)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="flex items-center gap-2 whitespace-nowrap rounded-card bg-kinari-deep px-3 py-3 text-[13px]">
        <SettingsIcon icon="noSignup" />
        登録不要でお試しいただけます
      </p>
    </div>
  );
}

// この欄の左のアイコン。そばの文字で意味がわかるので読み上げない。スマホではこの欄を隠しているので、見えるまで読まない
function SettingsIcon({ icon }: { icon: SettingsIconId }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={settingsIconSrc(icon, SETTINGS_ICON_WIDTHS[0])}
      srcSet={settingsIconSrcSet(icon)}
      sizes="32px"
      alt=""
      loading="lazy"
      draggable={false}
      className="size-8 shrink-0 select-none object-contain"
    />
  );
}

// 地区の絵（028）。飾り
function DistrictThumb({ district }: { district: DistrictId }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={illustPictureSrc(DISTRICT_PICTURES[district], 480)}
      alt=""
      loading="lazy"
      draggable={false}
      className="h-8 w-12 shrink-0 select-none rounded object-cover"
    />
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
  options: readonly { value: string; label: string; disabled?: boolean }[];
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
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
