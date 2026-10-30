"use client";

import type { ReactNode } from "react";
import { CAR_LABELS, DISTRICT_NAMES, HOUSING_LABELS, familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { spriteId, spriteSrc } from "@/lib/illust/assets";
import { familyMembers } from "@/lib/illust/family";
import { SPRITE_SIZES } from "@/lib/illust/sprites";
import type { DistrictId } from "@/lib/town-district/resolve";

// お父さん（立つ）の絵の高さ（px）。ほかの人はこれに合わせて縮める（背の比をえらぶと同じにする）
const FATHER_HEIGHT = 104;

// PC の左の「わが家」（028 見本）：選んだ家族の絵と条件、「選び直す」。条件はえらぶで選んだもの
export function HomeCard({ conditions, onChangeConditions }: { conditions: Conditions & { district: DistrictId }; onChangeConditions: () => void }) {
  const members = familyMembers(conditions);
  const reference = SPRITE_SIZES["father-stand"].height;
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <h2 id="home-title" className="font-bold">
        わが家
      </h2>
      <div aria-hidden="true" className="flex items-end justify-center">
        {members.map((person, index) => {
          const id = spriteId(person, "stand");
          return (
            // eslint-disable-next-line @next/next/no-img-element -- 切り出した小さな WebP をそのまま出す（FamilyLayer と同じ）
            <img
              key={person}
              src={spriteSrc(id)}
              alt=""
              draggable={false}
              style={{ height: `${(SPRITE_SIZES[id].height / reference) * FATHER_HEIGHT}px` }}
              className={`w-auto select-none ${index > 0 ? "-ml-2" : ""}`}
            />
          );
        })}
      </div>
      <p className="text-center text-sm">{familyLabel(conditions.adults, conditions.children)}</p>
      <ul className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
        <Row icon={<PlaceIcon />}>{DISTRICT_NAMES[conditions.district]}</Row>
        <Row icon={<HouseIcon />}>{HOUSING_LABELS[conditions.housing]}</Row>
        {conditions.car !== null && <Row icon={<CarIcon />}>車{CAR_LABELS[conditions.car]}</Row>}
      </ul>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onChangeConditions}
        className="flex min-h-tap items-center gap-2 border-t border-line pt-2 text-sm font-bold text-ink hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <PencilIcon />
        選び直す
      </button>
    </section>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {icon}
      {children}
    </li>
  );
}

// 条件の印（見本：深緑の平らな印）。飾り
const ICON = "size-5 shrink-0 text-primary";

function PlaceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={ICON} fill="currentColor">
      <path d="M12 2.5c-4 0-7 3-7 6.9 0 5 7 12.1 7 12.1s7-7.1 7-12.1c0-3.9-3-6.9-7-6.9Zm0 9.7a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z" />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={ICON} fill="currentColor">
      <path d="M12 3 2.5 11H5v9h5v-5h4v5h5v-9h2.5z" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={ICON} fill="currentColor">
      <path d="M5.5 10.5 7.2 6h9.6l1.7 4.5H20a1 1 0 0 1 1 1V17h-2v1.5a1 1 0 0 1-2 0V17H7v1.5a1 1 0 0 1-2 0V17H3v-5.5a1 1 0 0 1 1-1zm2.3 0h8.4l-1-2.7H8.8zM7 14.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm10 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" strokeLinecap="round" />
    </svg>
  );
}
