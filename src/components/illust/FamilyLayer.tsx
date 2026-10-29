"use client";

import { useEffect, useRef, useState } from "react";
import { spriteId, spriteSrc, type ErabuBaseId, type Person } from "@/lib/illust/assets";
import { placeFamily, type Placement } from "@/lib/illust/family";
import { Sparkles, type SparklePoint } from "./Sparkles";

// 出てきた人がよろこぶポーズでいる時間。そのあと立つポーズに戻る
const JOY_MS = 1200;
// 消える動き（tailwind の animate-pop-out）の長さ。終わったら絵から外す
const LEAVE_MS = 240;

// プレビューの背景の上に家族を立たせる（028）。人が増えるとぽんと出てキラキラが散り、減るとすっと消える。
// 動きはすべて motion-safe: に付け、端末の「動きを減らす」では動かさない（ポーズは変わる）。
// 絵は飾りで、家族の構成はプレビューの枠の名前で読み上げる
export function FamilyLayer({ members, background }: { members: readonly Person[]; background: ErabuBaseId }) {
  const placements = placeFamily(members, background);
  const leaving = useLeavingPlacements(placements);
  return (
    <div aria-hidden="true" className="absolute inset-0 z-10">
      {placements.map((placement) => (
        <PersonSprite key={placement.person} placement={placement} />
      ))}
      {leaving.map((placement) => (
        <PersonSprite key={`leaving-${placement.person}`} placement={placement} leaving />
      ))}
    </div>
  );
}

// 外れた人を、消える動きのあいだだけ前の位置に残す
function useLeavingPlacements(placements: readonly Placement[]): Placement[] {
  // placements は描くたびに作り直されるので、人の並びが変わったときだけ比べる。比べる中身は ref から読む
  const latest = useRef(placements);
  latest.current = placements;
  const previous = useRef(placements);
  const [leaving, setLeaving] = useState<Placement[]>([]);
  const key = placements.map(({ person }) => person).join(",");

  useEffect(() => {
    const now = new Set(latest.current.map(({ person }) => person));
    const removed = previous.current.filter(({ person }) => !now.has(person));
    previous.current = latest.current;
    if (removed.length === 0) return;
    setLeaving((current) => [...current.filter(({ person }) => !now.has(person)), ...removed]);
    const timer = setTimeout(() => setLeaving((current) => current.filter((placement) => !removed.includes(placement))), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [key]);

  return leaving.filter(({ person }) => !placements.some((placement) => placement.person === person));
}

// キラキラの位置（人の絵の幅・高さに対する％）と、出る順のずれ
const SPARKLES: readonly SparklePoint[] = [
  { x: -8, y: 18, delay: 0 },
  { x: 108, y: 10, delay: 60 },
  { x: 100, y: 46, delay: 120 },
  { x: -2, y: 56, delay: 180 },
];

function PersonSprite({ placement, leaving = false }: { placement: Placement; leaving?: boolean }) {
  const [pose, setPose] = useState<"joy" | "stand">(leaving ? "stand" : "joy");
  useEffect(() => {
    if (leaving) return;
    const timer = setTimeout(() => setPose("stand"), JOY_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

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
