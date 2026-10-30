"use client";

import { useEffect, useState } from "react";
import { spriteId, spriteSrc, type Person, type Pose } from "@/lib/illust/assets";
import { placeFamily, type FamilyStageId, type Placement } from "@/lib/illust/family";
import { Sparkles, type SparklePoint } from "./Sparkles";
import { useLeavingItems } from "./useLeavingItems";

// 出てきた人がよろこぶポーズでいる時間。そのあと立つポーズに戻る
const JOY_MS = 1200;

// プレビューの背景の上に家族を立たせる（028）。人が増えるとぽんと出てキラキラが散り、減るとすっと消える。
// 動きはすべて motion-safe: に付け、端末の「動きを減らす」では動かさない（ポーズは変わる）。
// 絵は飾りで、家族の構成はプレビューの枠の名前で読み上げる。
// facing="back" は後ろ姿で町を見わたす形（05。見本どおり）、"rear" は真後ろ姿で風景の中へ歩いていく形（くらし）。
// 後ろ姿はよろこぶポーズにはせず、後ろ姿のままぽんと出る
export function FamilyLayer({
  members,
  background,
  facing = "front",
}: {
  members: readonly Person[];
  background: FamilyStageId;
  facing?: Facing;
}) {
  const placements = placeFamily(members, background);
  const leaving = useLeavingItems(placements, personOf);
  return (
    <div aria-hidden="true" className="absolute inset-0 z-10">
      {placements.map((placement) => (
        <PersonSprite key={placement.person} placement={placement} facing={facing} />
      ))}
      {leaving.map((placement) => (
        <PersonSprite key={`leaving-${placement.person}`} placement={placement} facing={facing} leaving />
      ))}
    </div>
  );
}

type Facing = "front" | "back" | "rear";

function personOf({ person }: Placement): string {
  return person;
}

// キラキラの位置（人の絵の幅・高さに対する％）と、出る順のずれ
const SPARKLES: readonly SparklePoint[] = [
  { x: -8, y: 18, delay: 0 },
  { x: 108, y: 10, delay: 60 },
  { x: 100, y: 46, delay: 120 },
  { x: -2, y: 56, delay: 180 },
];

function PersonSprite({ placement, facing, leaving = false }: { placement: Placement; facing: Facing; leaving?: boolean }) {
  const [entered, setEntered] = useState(leaving);
  useEffect(() => {
    if (leaving) return;
    const timer = setTimeout(() => setEntered(true), JOY_MS);
    return () => clearTimeout(timer);
  }, [leaving]);
  const pose: Pose = facing !== "front" ? facing : entered ? "stand" : "joy";

  return (
    <span
      className="absolute -translate-x-1/2 transition-[left] duration-300 ease-out motion-reduce:transition-none"
      style={{ left: `${placement.centerX}%`, bottom: `${100 - placement.footY}%`, height: `${placement.heightPercent(pose)}%` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 切り出した小さな WebP をそのまま出す（高さを割合で決めるため） */}
      <img
        src={spriteSrc(spriteId(placement.person, pose))}
        alt=""
        draggable={false}
        className={`h-full w-auto max-w-none origin-bottom select-none ${leaving ? "motion-safe:animate-pop-out" : "motion-safe:animate-pop-in"}`}
      />
      {!leaving && <Sparkles points={SPARKLES} />}
    </span>
  );
}
