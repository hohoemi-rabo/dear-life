"use client";

import type { ReactNode } from "react";
import { FamilyHint } from "@/components/illust/FamilyHint";
import { IllustPicture } from "@/components/illust/IllustPicture";
import { PixelImage } from "@/components/pixel/PixelImage";
import { PixelStage } from "@/components/pixel/PixelStage";
import {
  CAR_LABELS,
  DISTRICTS,
  HOUSING_LABELS,
  KARTE_CARD_LABELS,
  PRIORITIES,
  type CarCount,
  type Housing,
} from "@/lib/conditions/labels";
import { ADULTS_RANGE, CHILDREN_RANGE, type Conditions } from "@/lib/conditions/model";
import type { QuestionId } from "@/lib/erabu/questions";
import { DISTRICT_PICTURES, HOUSE_WIDTHS, houseSrc } from "@/lib/illust/assets";
import { landmarkAssetId, type PixelAssetId } from "@/lib/pixel/assets";
import { ChoiceCard } from "./ChoiceCard";

type Props = {
  question: QuestionId;
  conditions: Conditions;
  onChange: (update: Partial<Conditions>) => void;
};

// 質問ごとの選択肢。入力はすべてタップ（F-01）
export function QuestionBody({ question, conditions, onChange }: Props) {
  switch (question) {
    case "district":
      return <DistrictChoices conditions={conditions} onChange={onChange} />;
    case "family":
      return <FamilyCounter conditions={conditions} onChange={onChange} />;
    case "housing":
      return <HousingChoices conditions={conditions} onChange={onChange} />;
    case "car":
      return <CarChoices conditions={conditions} onChange={onChange} />;
    case "priorities":
      return <PriorityChoices conditions={conditions} onChange={onChange} />;
  }
}

type ChoiceProps = Omit<Props, "question">;

// 地区の選択肢（028 見本）：上半分に地区の絵、下に名前。選んだものは枠を緑にして左上に ✓。
// 絵があるのはまず上郷だけで、ほかの3地区は用意できるまで今のドット絵（仮）
function DistrictChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <ul className="grid grid-cols-2 gap-3" aria-label="住む地区">
      {DISTRICTS.map(({ id, name }) => {
        const picture = DISTRICT_PICTURES[id];
        return (
          <li key={id}>
            <PictureChoiceCard
              selected={conditions.district === id}
              onSelect={() => onChange({ district: id })}
              check="left"
              pictureClassName="aspect-[16/9]"
              picture={
                picture ? (
                  <IllustPicture picture={picture} sizes="(min-width: 640px) 280px, 50vw" decorative className="size-full object-cover" />
                ) : (
                  <PixelStage className="size-full">
                    <PixelImage asset={landmarkAssetId(id, "spring")} scale={2} decorative />
                  </PixelStage>
                )
              }
              label={name}
            />
          </li>
        );
      })}
    </ul>
  );
}

// 絵のある選択肢のカード（028 見本の 01 地区・03 家）。上に絵、下に名前と説明。選んだものは枠を緑にして ✓ を付ける
// （色だけに頼らないよう、印と aria-pressed でも伝える）
function PictureChoiceCard({
  selected,
  onSelect,
  check,
  picture,
  pictureClassName,
  label,
  labelClassName = "",
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  // ✓ を付ける角（見本：地区は左上、家は右上）
  check: "left" | "right";
  picture: ReactNode;
  pictureClassName: string;
  label: string;
  // 3つ並べる家のカードは、名前を1行に収めるため少し小さくする
  labelClassName?: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "relative flex h-full w-full flex-col items-stretch gap-1 rounded-card border-2 bg-surface p-1.5 pb-2 text-center transition duration-150 active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "border-primary shadow-card" : "border-line hover:border-primary/50",
      ].join(" ")}
    >
      {selected && <CheckMark className={check === "left" ? "left-2.5 top-2.5" : "right-2.5 top-2.5"} />}
      <span className={`block overflow-hidden rounded-[0.6rem] ${pictureClassName}`}>{picture}</span>
      <span className={`whitespace-nowrap font-bold ${labelClassName}`}>{label}</span>
      {description && <span className="-mt-1 whitespace-nowrap text-xs text-ink-muted">{description}</span>}
    </button>
  );
}

// 選んだ印。色だけに頼らないよう ✓ を出す（ボタンの aria-pressed でも伝える）
function CheckMark({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-10 flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ring-2 ring-white ${className}`}
    >
      ✓
    </span>
  );
}

// 家族の人数（028 見本）：大人・子どもの「−・＋」を横に並べ、下に「人数を変えると、家族も変わります。」の絵。
// 家族の絵そのものは上のプレビューに出る
function FamilyCounter({ conditions, onChange }: ChoiceProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Counter label="大人" value={conditions.adults} range={ADULTS_RANGE} onChange={(adults) => onChange({ adults })} />
        <Counter label="子ども" value={conditions.children} range={CHILDREN_RANGE} onChange={(children) => onChange({ children })} />
      </div>
      <FamilyHint />
    </div>
  );
}

function Counter({
  label,
  value,
  range,
  onChange,
}: {
  label: string;
  value: number;
  range: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  const buttonClass =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-2xl font-bold transition duration-150 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";
  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-kinari-deep px-2 py-3">
      <span className="font-bold">{label}</span>
      <div className="flex w-full items-center justify-between gap-1">
        <button
          type="button"
          className={`${buttonClass} border border-line bg-surface text-ink hover:bg-kinari`}
          aria-label={`${label}を1人減らす`}
          disabled={value <= range.min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-live="polite" aria-label={`${label}の人数`} className="text-3xl font-bold tabular-nums">
          {value}
          <span className="text-base">人</span>
        </output>
        <button
          type="button"
          className={`${buttonClass} bg-gold text-white hover:bg-gold-hover`}
          aria-label={`${label}を1人増やす`}
          disabled={value >= range.max}
          onClick={() => onChange(value + 1)}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

// 家の選択肢の説明（028 見本）。「新しめ・古め」の境目は相場の区分（築20年以内・21年以上）と同じ
const HOUSING_CHOICES: readonly { id: Housing; description: string }[] = [
  { id: "new", description: "築20年以内" },
  { id: "old", description: "築21年以上" },
  { id: "rent", description: "アパート・借家" },
];

// 家の選択肢（028 見本）：家の絵、下に名前と説明。選んだものは右上に ✓。
// 家の絵はプレビューと同じもの（4地区で使い回す）。絵の後ろは透明なので、カードの地の色のまま出す（2026-10-29 まさゆきさん）
function HousingChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="家">
      {HOUSING_CHOICES.map(({ id, description }) => (
        <li key={id}>
          <PictureChoiceCard
            selected={conditions.housing === id}
            onSelect={() => onChange({ housing: id })}
            check="right"
            pictureClassName="flex aspect-square sm:aspect-[4/3] items-end justify-center px-1 pb-1.5"
            picture={
              // eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由）
              <img
                src={houseSrc(id, HOUSE_WIDTHS[0])}
                srcSet={HOUSE_WIDTHS.map((w) => `${houseSrc(id, w)} ${w}w`).join(", ")}
                sizes="(min-width: 640px) 180px, 30vw"
                alt=""
                draggable={false}
                decoding="async"
                className="w-full select-none"
              />
            }
            label={HOUSING_LABELS[id]}
            labelClassName="text-sm sm:text-base"
            description={description}
          />
        </li>
      ))}
    </ul>
  );
}

const CAR_CHOICES: readonly { id: CarCount; art: PixelAssetId; description: string }[] = [
  { id: 0, art: "vehicle-bus", description: "バスや電車で" },
  { id: 1, art: "vehicle-car", description: "家族で1台" },
  { id: 2, art: "vehicle-car", description: "1人1台など" },
];

// もう一度押すと未選択に戻す（任意の質問なので）
function CarChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="車の台数">
      {CAR_CHOICES.map(({ id, art, description }) => (
        <li key={id}>
          <ChoiceCard
            selected={conditions.car === id}
            onSelect={() => onChange({ car: conditions.car === id ? null : id })}
            art={<PixelImage asset={art} scale={2} decorative />}
            label={CAR_LABELS[id]}
            description={description}
          />
        </li>
      ))}
    </ul>
  );
}

function PriorityChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <ul className="grid grid-cols-2 gap-2" aria-label="大切にしたいこと">
      {PRIORITIES.map((priority) => {
        const selected = conditions.priorities.includes(priority);
        return (
          <li key={priority}>
            <ChoiceCard
              selected={selected}
              onSelect={() =>
                onChange({
                  priorities: selected
                    ? conditions.priorities.filter((picked) => picked !== priority)
                    : [...conditions.priorities, priority],
                })
              }
              label={KARTE_CARD_LABELS[priority]}
            />
          </li>
        );
      })}
    </ul>
  );
}
