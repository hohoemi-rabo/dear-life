"use client";

import { PixelImage } from "@/components/pixel/PixelImage";
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
import { familyArtFor, landmarkAssetId, type PixelAssetId } from "@/lib/pixel/assets";
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

function DistrictChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <ul className="grid grid-cols-2 gap-3" aria-label="住む地区">
      {DISTRICTS.map(({ id, name }) => (
        <li key={id}>
          <ChoiceCard
            selected={conditions.district === id}
            onSelect={() => onChange({ district: id })}
            art={<PixelImage asset={landmarkAssetId(id, "spring")} scale={2} decorative />}
            label={name}
          />
        </li>
      ))}
    </ul>
  );
}

function FamilyCounter({ conditions, onChange }: ChoiceProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <PixelImage asset={familyArtFor(conditions.adults, conditions.children)} scale={3} decorative />
      <div className="flex w-full flex-col gap-3">
        <Counter
          label="大人"
          value={conditions.adults}
          range={ADULTS_RANGE}
          onChange={(adults) => onChange({ adults })}
        />
        <Counter
          label="子ども"
          value={conditions.children}
          range={CHILDREN_RANGE}
          onChange={(children) => onChange({ children })}
        />
      </div>
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
    "flex size-12 items-center justify-center rounded-full border-2 border-primary bg-surface text-2xl font-bold text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted disabled:hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-2">
      <span className="text-lg font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          aria-label={`${label}を1人減らす`}
          disabled={value <= range.min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-live="polite" className="w-14 text-center text-2xl font-bold tabular-nums">
          {value}
          <span className="text-base">人</span>
        </output>
        <button
          type="button"
          className={buttonClass}
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

const HOUSING_CHOICES: readonly { id: Housing; art: PixelAssetId; description: string }[] = [
  { id: "new", art: "house-new", description: "築20年以内の中古戸建て" },
  { id: "old", art: "house-old", description: "築21年以上の中古戸建て" },
  { id: "rent", art: "house-rent", description: "アパート・借家" },
];

function HousingChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="家">
      {HOUSING_CHOICES.map(({ id, art, description }) => (
        <li key={id}>
          <ChoiceCard
            selected={conditions.housing === id}
            onSelect={() => onChange({ housing: id })}
            art={<PixelImage asset={art} scale={2} decorative />}
            label={HOUSING_LABELS[id]}
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
