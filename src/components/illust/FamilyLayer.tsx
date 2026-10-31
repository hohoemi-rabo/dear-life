"use client";

import { useEffect, useState } from "react";
import { spriteId, spriteSrc, type Person, type Pose } from "@/lib/illust/assets";
import { placeFamily, type FamilyStageId, type Placement } from "@/lib/illust/family";
import { ExtraChildrenBadge } from "./ExtraChildrenBadge";
import { Sparkles, type SparklePoint } from "./Sparkles";
import { useLeavingItems } from "./useLeavingItems";

// 出てきた人がよろこぶポーズでいる時間。そのあと立つポーズに戻る
const JOY_MS = 1200;

// プレビューの背景の上に家族を立たせる（028）。人が増えるとぽんと出てキラキラが散り、減るとすっと消える。
// 動きはすべて motion-safe: に付け、端末の「動きを減らす」では動かさない（ポーズは変わる）。
// 絵は飾りで、家族の構成はプレビューの枠の名前で読み上げる。
// facing="back" は斜め後ろ姿で町を見わたす形（えらぶ 05・くらし）。よろこぶポーズにはせず、後ろ姿のままぽんと出る。
// 絵に出せない5人目からの子ども（hiddenChildren）は、いちばん右の子どもの頭の上に「＋N人」の札で出し、
// 増やしたときは今いる子どもたちがよろこんで跳ねる（2026-10-31 まさゆきさん）
export function FamilyLayer({
  members,
  hiddenChildren = 0,
  background,
  facing = "front",
}: {
  members: readonly Person[];
  hiddenChildren?: number;
  background: FamilyStageId;
  facing?: Facing;
}) {
  const placements = placeFamily(members, background);
  const leaving = useLeavingItems(placements, personOf);
  const cheer = useCheer(hiddenChildren);
  const lastChild = placements.findLast(({ person }) => !ADULTS.has(person));
  const pose: Pose = facing === "back" ? "back" : "stand";
  return (
    <div aria-hidden="true" className="absolute inset-0 z-10">
      {placements.map((placement) => (
        <PersonSprite key={placement.person} placement={placement} facing={facing} cheer={ADULTS.has(placement.person) ? 0 : cheer} />
      ))}
      {lastChild && hiddenChildren > 0 && (
        <span
          className="absolute z-10 -translate-x-1/2"
          style={{ left: `${lastChild.centerX}%`, bottom: `${100 - lastChild.footY + lastChild.heightPercent(pose) + 1}%` }}
        >
          <ExtraChildrenBadge count={hiddenChildren} />
        </span>
      )}
      {leaving.map((placement) => (
        <PersonSprite key={`leaving-${placement.person}`} placement={placement} facing={facing} leaving />
      ))}
    </div>
  );
}

type Facing = "front" | "back";

const ADULTS: ReadonlySet<Person> = new Set(["father", "mother"]);

// 絵に出せない子どもが増えた回数。減らしたときは数えない（跳ねるのは増えたときだけ）
function useCheer(hiddenChildren: number): number {
  const [seen, setSeen] = useState(hiddenChildren);
  const [cheer, setCheer] = useState(0);
  if (hiddenChildren !== seen) {
    setSeen(hiddenChildren);
    if (hiddenChildren > seen) setCheer(cheer + 1);
  }
  return cheer;
}

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

// cheer が増えると、よろこぶポーズ（後ろ姿のときはそのまま）でぴょんと跳ね、キラキラを散らす
function PersonSprite({
  placement,
  facing,
  leaving = false,
  cheer = 0,
}: {
  placement: Placement;
  facing: Facing;
  leaving?: boolean;
  cheer?: number;
}) {
  const [entered, setEntered] = useState(leaving);
  // 出てきたときの cheer。これより増えたら跳ねる（あとから出てきた子どもは、ふつうにぽんと出る）
  const [cheerAtEntry] = useState(cheer);
  const [seenCheer, setSeenCheer] = useState(cheer);
  if (cheer !== seenCheer) {
    setSeenCheer(cheer);
    setEntered(false);
  }
  useEffect(() => {
    if (leaving || entered) return;
    const timer = setTimeout(() => setEntered(true), JOY_MS);
    return () => clearTimeout(timer);
  }, [leaving, entered]);
  const pose: Pose = facing === "back" ? "back" : entered ? "stand" : "joy";
  const hopping = cheer !== cheerAtEntry;
  const motion = leaving ? "motion-safe:animate-pop-out" : hopping ? "motion-safe:animate-hop" : "motion-safe:animate-pop-in";

  return (
    <span
      className="absolute -translate-x-1/2 transition-[left] duration-300 ease-out motion-reduce:transition-none"
      style={{ left: `${placement.centerX}%`, bottom: `${100 - placement.footY}%`, height: `${placement.heightPercent(pose)}%` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 切り出した小さな WebP をそのまま出す（高さを割合で決めるため） */}
      <img
        key={`sprite-${cheer}`}
        src={spriteSrc(spriteId(placement.person, pose))}
        alt=""
        draggable={false}
        className={`h-full w-auto max-w-none origin-bottom select-none ${motion}`}
      />
      {!leaving && <Sparkles key={`sparkles-${cheer}`} points={SPARKLES} />}
    </span>
  );
}
