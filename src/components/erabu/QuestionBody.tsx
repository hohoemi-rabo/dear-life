"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CarChoicePicture } from "@/components/illust/CarChoicePicture";
import { FamilyHint } from "@/components/illust/FamilyHint";
import { IllustPicture } from "@/components/illust/IllustPicture";
import { PixelImage } from "@/components/pixel/PixelImage";
import { PixelStage } from "@/components/pixel/PixelStage";
import {
  CAR_LABELS,
  DISTRICT_NAMES,
  DISTRICTS,
  familyLabel,
  HOUSING_LABELS,
  KARTE_CARD_LABELS,
  PRIORITIES,
  type CarCount,
  type Housing,
  type Priority,
} from "@/lib/conditions/labels";
import { ADULTS_RANGE, CHILDREN_RANGE, type Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import type { QuestionId } from "@/lib/erabu/questions";
import {
  DISTRICT_PICTURES,
  HOUSE_WIDTHS,
  houseSrc,
  PRIORITY_ICON_WIDTHS,
  priorityIconSrc,
  priorityIconSrcSet,
  PROP_WIDTHS,
  propSrc,
  propSrcSet,
} from "@/lib/illust/assets";
import { familyMembers } from "@/lib/illust/family";
import { landmarkAssetId } from "@/lib/pixel/assets";
import { MAP_PATH } from "@/lib/site";

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
function CheckMark({ className, sizeClassName = "size-6 text-sm" }: { className: string; sizeClassName?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-10 flex items-center justify-center rounded-full bg-primary font-bold text-white ring-2 ring-white ${sizeClassName} ${className}`}
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

// 車の台数を選んだときの帯の言葉（028 見本の「家族で1台の暮らしを想像します」。ほかの台数も同じ形にそろえる。2026-10-29 まさゆきさん）
const CAR_STAGES: Readonly<Record<CarCount, string>> = {
  0: "車なしの暮らしを想像します",
  1: "家族で1台の暮らしを想像します",
  2: "家族で2台以上の暮らしを想像します",
};

// 車の選択肢（028 見本）：絵、下に台数。選んだものは右上に ✓。もう一度押すと未選択に戻す（任意の質問なので）。
// 下に選んだ台数の帯（未選択なら出さない）と、地図でバス停を見るカード（台数によらず出す）
function CarChoices({ conditions, onChange }: ChoiceProps) {
  const members = familyMembers(conditions);
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-3 gap-2" aria-label="車の台数">
        {CAR_COUNTS.map((car) => (
          <li key={car}>
            <PictureChoiceCard
              selected={conditions.car === car}
              onSelect={() => onChange({ car: conditions.car === car ? null : car })}
              check="right"
              pictureClassName="aspect-[5/4] px-1 pb-1"
              picture={<CarChoicePicture car={car} members={members} />}
              label={CAR_LABELS[car]}
              labelClassName="order-first pr-5 pt-1 text-base min-[400px]:pr-0 min-[400px]:text-lg"
            />
          </li>
        ))}
      </ul>
      {conditions.car !== null && (
        <p className="rounded-button bg-kinari-deep px-4 py-2 text-center text-sm">{CAR_STAGES[conditions.car]}</p>
      )}
      <BusStopMapLink conditions={conditions} />
    </div>
  );
}

const CAR_COUNTS: readonly CarCount[] = [0, 1, 2];

// 地図でバス停の場所を見るカード（028 見本）。便の数や所要時間はここでは出さないので、別に確かめるよう添える
function BusStopMapLink({ conditions }: { conditions: Conditions }) {
  return (
    <Link
      href={conditionsHref(MAP_PATH, conditions)}
      className="flex items-center gap-3 rounded-card border border-warm/60 bg-warm-soft px-3 py-2.5 transition duration-150 hover:border-warm active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex h-12 w-20 shrink-0 items-end justify-center overflow-hidden rounded-[0.6rem] bg-surface px-1 pb-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由） */}
        <img
          src={propSrc("station-wide", PROP_WIDTHS[0])}
          srcSet={propSrcSet("station-wide")}
          sizes="80px"
          alt=""
          draggable={false}
          decoding="async"
          className="w-full select-none"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold sm:text-base">バス停の場所は、地図で確認</span>
        <span className="text-xs text-ink-muted">運行本数や所要時間は、別途確認が必要です。</span>
      </span>
      <span aria-hidden="true" className="text-2xl text-ink-muted">
        ›
      </span>
    </Link>
  );
}

// 大切にしたいことの選択肢（028 見本）：2列の横長のカード（左に絵、右に名前）。人口は2列ぶん。
// 選んだものは緑の枠と右上に ✓、選んでいないものは右上に空の丸。いくつでも選べて、もう一度押すと外れる。
// 下に「カルテで先に表示します」の帯と、ここまでに選んだ条件の帯（見本どおり地区・家族・車。家は見本の帯にないので出さない）
function PriorityChoices({ conditions, onChange }: ChoiceProps) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2" aria-label="大切にしたいこと">
        {PRIORITIES.map((priority, index) => {
          const selected = conditions.priorities.includes(priority);
          // 数が奇数なので、最後の1つ（人口）は2列ぶんの幅にする
          const wide = index === PRIORITIES.length - 1 && PRIORITIES.length % 2 === 1;
          return (
            <li key={priority} className={wide ? "col-span-2" : ""}>
              <PriorityCard
                priority={priority}
                selected={selected}
                onSelect={() =>
                  onChange({
                    priorities: selected
                      ? conditions.priorities.filter((picked) => picked !== priority)
                      : [...conditions.priorities, priority],
                  })
                }
              />
            </li>
          );
        })}
      </ul>
      <p className="rounded-button bg-kinari-deep px-4 py-2 text-center text-sm">選んだ情報を、カルテで先に表示します</p>
      <ChosenConditions conditions={conditions} />
    </div>
  );
}

// スマホ（400px 未満）ではカードを見本の高さに詰めるので、右上の印も小さくして名前と重ならないようにする
const PRIORITY_CHECK_PLACE = "right-1.5 top-1.5 min-[400px]:right-2 min-[400px]:top-2";
const PRIORITY_CHECK_SIZE = "size-5 min-[400px]:size-6";

function PriorityCard({ priority, selected, onSelect }: { priority: Priority; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "relative flex min-h-[3.75rem] w-full items-center gap-1.5 rounded-card border-2 bg-surface py-1.5 pl-2 pr-7 text-left transition duration-150 active:scale-[0.98] min-[400px]:min-h-[4.5rem] min-[400px]:gap-3 min-[400px]:py-2 min-[400px]:pr-8",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "border-primary shadow-card" : "border-line hover:border-primary/50",
      ].join(" ")}
    >
      {selected ? (
        <CheckMark className={PRIORITY_CHECK_PLACE} sizeClassName={`${PRIORITY_CHECK_SIZE} text-xs min-[400px]:text-sm`} />
      ) : (
        <span aria-hidden="true" className={`absolute rounded-full border-2 border-line bg-surface ${PRIORITY_CHECK_PLACE} ${PRIORITY_CHECK_SIZE}`} />
      )}
      <span className="flex h-10 w-9 shrink-0 min-[400px]:h-12 items-center justify-center min-[375px]:w-10 min-[400px]:w-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由） */}
        <img
          src={priorityIconSrc(priority, PRIORITY_ICON_WIDTHS[0])}
          srcSet={priorityIconSrcSet(priority)}
          sizes="64px"
          alt=""
          draggable={false}
          decoding="async"
          className="max-h-full w-full select-none object-contain"
        />
      </span>
      <span className="whitespace-nowrap text-xs font-bold min-[375px]:text-[0.8125rem] min-[400px]:text-base">{KARTE_CARD_LABELS[priority]}</span>
    </button>
  );
}

// ここまでに選んだ条件の帯（028 見本の 05）：山の印＋地区 ｜ 人の印＋家族 ｜ 車の印＋台数。車が未選択なら車は出さない。
// 印は見本どおり平らな緑の印（実データではなく飾りなので読み上げない）
function ChosenConditions({ conditions }: { conditions: Conditions }) {
  if (conditions.district === null) return null;
  const items: { icon: ReactNode; label: string }[] = [
    { icon: <MountainGlyph />, label: DISTRICT_NAMES[conditions.district] },
    { icon: <PeopleGlyph />, label: familyLabel(conditions.adults, conditions.children) },
  ];
  if (conditions.car !== null) items.push({ icon: <CarGlyph />, label: `車${CAR_LABELS[conditions.car]}` });
  return (
    <ul
      aria-label="選んだ条件"
      className="flex flex-wrap items-center justify-center gap-y-1 rounded-card border border-line bg-surface px-1 py-2.5 text-[0.8125rem] font-bold min-[400px]:px-3 min-[400px]:text-sm"
    >
      {items.map(({ icon, label }, index) => (
        <li key={label} className={`flex items-center gap-1 whitespace-nowrap px-2 min-[400px]:gap-1.5 min-[400px]:px-3 ${index > 0 ? "border-l border-line" : ""}`}>
          {icon}
          {label}
        </li>
      ))}
    </ul>
  );
}

const GLYPH_CLASS = "h-3.5 w-4 shrink-0 text-primary min-[400px]:h-4 min-[400px]:w-5";

function MountainGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 18" className={GLYPH_CLASS}>
      <path d="M1 17 8.5 5l3.6 5.6L15.5 6 23 17z" fill="currentColor" />
      <path d="M8.5 5 6.2 8.7l1.3-.6 1 .9 1-.9 1.2.5z" fill="white" />
    </svg>
  );
}

function PeopleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 18" className={GLYPH_CLASS}>
      <circle cx="7.5" cy="3" r="2.6" fill="currentColor" />
      <path d="M3.5 7.2c0-.9.7-1.6 1.6-1.6h4.8c.9 0 1.6.7 1.6 1.6V12H10l-.6 6H5.6L5 12H3.5z" fill="currentColor" />
      <circle cx="16.5" cy="5.2" r="2.2" fill="currentColor" />
      <path d="M13.2 8.9c0-.8.6-1.4 1.4-1.4h3.8c.8 0 1.4.6 1.4 1.4V13h-1.2l-.5 5h-3.2l-.5-5h-1.2z" fill="currentColor" />
    </svg>
  );
}

function CarGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 18" className={GLYPH_CLASS}>
      <path
        d="M5.2 4.6C5.6 3.4 6.7 2.6 8 2.6h8c1.3 0 2.4.8 2.8 2l1.4 4.1c1.3.4 2.3 1.6 2.3 3V15h-2.2a2.6 2.6 0 0 1-5.1 0H8.8a2.6 2.6 0 0 1-5.1 0H1.5v-3.3c0-1.4 1-2.6 2.3-3zM7.6 4.8 6.6 8.4h10.8l-1-3.6z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}
