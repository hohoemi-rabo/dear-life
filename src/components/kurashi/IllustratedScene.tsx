"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { preload } from "react-dom";
import { FamilyLayer } from "@/components/illust/FamilyLayer";
import { Mascot, MascotCompanion } from "@/components/mascot/Mascot";
import { CloseIconButton, SheetEyebrow } from "@/components/ui/BottomSheet";
import { ILLUST_PICTURES, type KurashiPictureId, type KurashiPictures, type Person } from "@/lib/illust/assets";
import { largestSrc, scenePicturePreloads, scenePictureSrcSet, TALL_SIZES, WIDE_MEDIA, WIDE_SIZES } from "@/lib/kurashi/scene-picture";
import type { Season } from "@/lib/conditions/scene";
import { companionPlacement } from "@/lib/illust/family";
import type { MascotMotionId } from "@/lib/mascot/assets";
import { mascotPlacement } from "@/lib/mascot/spots";
import type { DistrictId } from "@/lib/town-district/resolve";
import type { PinSpot, ScenePinSpec } from "@/lib/kurashi/pins";
import { PinIcon } from "./PinIcon";
import { ScenePin } from "./ScenePin";

// 生成AIで描いた季節の風景（028 見本。まず上郷・春）。スマホは縦長、PC は横長の絵を出しわけ、
// 広場の奥に選んだ家族を斜め後ろ姿で重ね、場所にピンを立てる。PC はピンを押すと絵の上に吹き出しを出す（スマホは下からのシートで、KurashiView が出す）
export function IllustratedScene({
  district,
  pictures,
  season,
  label,
  members,
  hiddenChildren,
  pins,
  openPin,
  onOpenPin,
  popover,
  companion = null,
}: {
  // マスコット（042）のしぐさを選ぶ
  district: DistrictId;
  pictures: KurashiPictures;
  // 家族の服の季節（2026-11-01 まさゆきさん）
  season: Season;
  // 風景の説明（読み上げ）。家族の構成も入れる
  label: string;
  members: readonly Person[];
  // 絵に出せない5人目からの子ども（「＋N人」の札で出す）
  hiddenChildren: number;
  pins: readonly ScenePinSpec[];
  // 開いているピンの key
  openPin: string | null;
  onOpenPin: (pin: string | null) => void;
  // PC の吹き出し（開いているピンの中身）。スマホでは null
  popover: { eyebrow: string; title: string; content: ReactNode; spot: PinSpot } | null;
  // 一人のときのぽてり（043）。スマホの縦長の絵で、風景を眺める人の横に並べる（PC は左の「わが家」に出る）
  companion?: MascotMotionId | null;
}) {
  const pinRefs = useRef(new Map<string, HTMLButtonElement>());
  // マスコット（042）。動きが届いた地区の絵にだけ出す
  const mascot = mascotPlacement(district, season);
  const closePopover = () => {
    const pin = openPin;
    onOpenPin(null);
    // 吹き出しを閉じたら、開いたピンに戻る（キーボードで続けて選べるように）
    if (pin) pinRefs.current.get(pin)?.focus();
  };

  return (
    <figure role="group" aria-label={label} className="relative isolate aspect-[1122/1402] overflow-hidden bg-pixel-sky lg:aspect-[3/2]">
      <ScenePicture pictures={pictures} />
      <div className="absolute inset-0 lg:hidden">
        <FamilyLayer members={members} hiddenChildren={hiddenChildren} background={pictures.tall} facing="back" season={season} />
        {companion && <SceneCompanion motion={companion} members={members} background={pictures.tall} />}
      </div>
      <div className="absolute inset-0 hidden lg:block">
        <FamilyLayer members={members} hiddenChildren={hiddenChildren} background={pictures.wide} facing="back" season={season} />
      </div>
      {mascot && <Mascot motion={mascot.motion} wide={mascot.wide} tall={mascot.tall} />}
      {pins.map((pin) => (
        <ScenePin
          key={pin.key}
          ref={(element) => {
            if (element) pinRefs.current.set(pin.key, element);
            else pinRefs.current.delete(pin.key);
          }}
          label={pin.label}
          icon={<PinIcon pin={pin} />}
          tall={pin.tall}
          wide={pin.wide}
          active={openPin === pin.key}
          onOpen={() => onOpenPin(openPin === pin.key ? null : pin.key)}
        />
      ))}
      {popover && openPin && (
        <PinPopover key={openPin} spot={popover.spot} eyebrow={popover.eyebrow} title={popover.title} onClose={closePopover}>
          {popover.content}
        </PinPopover>
      )}
      <span aria-hidden="true" className="absolute bottom-2 right-2 z-20 rounded-md bg-ink/60 px-2 py-0.5 text-xs text-white">
        <span className="lg:hidden">イメージの風景</span>
        <span className="hidden lg:inline">暮らしを想像するための風景</span>
      </span>
    </figure>
  );
}

// 一人のときのぽてり（043）を、風景を眺める人のすぐ右に立たせる（2026-11-19 まさゆきさん：スマホでも出す）
function SceneCompanion({ motion, members, background }: { motion: MascotMotionId; members: readonly Person[]; background: KurashiPictureId }) {
  const spot = companionPlacement(members, background);
  if (!spot) return null;
  return (
    <span className="absolute z-10" style={{ left: `${spot.left}%`, bottom: `${100 - spot.footY}%`, height: `${spot.height}%` }}>
      <MascotCompanion motion={motion} className="h-full" />
    </span>
  );
}

// 風景の絵を、画面のデータを待たずに読み始める（絵は地区と季節だけで決まる）。データの読み込み（約1秒）と並べて読むため、
// ScreenDataBoundary の外（KurashiView）で呼ぶ（2026-11-01 測り直し）。同じ絵を何度呼んでも、先読みは1回だけ。
// HTML にも同じ先読みを埋めこんである（ScenePicturePreloadScript）。こちらは季節を切りかえたときのため
export function preloadScenePicture(pictures: KurashiPictures) {
  for (const { href, srcSet, sizes, media } of scenePicturePreloads(pictures)) {
    preload(href, { as: "image", imageSrcSet: srcSet, imageSizes: sizes, media, fetchPriority: "high" });
  }
}

// スマホは縦長、PC は横長の絵（<picture> で幅によって選ばせ、両方は読まない）。説明は figure の名前で読むので飾りにする
export function ScenePicture({ pictures }: { pictures: KurashiPictures }) {
  const tall = ILLUST_PICTURES[pictures.tall];
  return (
    <picture>
      <source media={WIDE_MEDIA} srcSet={scenePictureSrcSet(pictures.wide)} sizes={WIDE_SIZES} />
      {/* 静的書き出しでは next/image の srcset が使えないので <img>（IllustPicture と同じ） */}
      <img
        src={largestSrc(pictures.tall)}
        srcSet={scenePictureSrcSet(pictures.tall)}
        sizes={TALL_SIZES}
        width={tall.width}
        height={tall.height}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full select-none object-cover"
      />
    </picture>
  );
}

// PC の吹き出し（見本）：ピンの横に出し、×・Esc・吹き出しの外を押すと閉じる。開いたら中に移り、閉じたらピンに戻る（closePopover）。
// ピンが絵の右半分にあるときは左に出して、はみ出さないようにする。高さは絵の中に収める
function PinPopover({
  spot,
  eyebrow,
  title,
  onClose,
  children,
}: {
  spot: PinSpot;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    box.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // ピンを押したときは、ピンの側で開け閉めする
      if (box.current?.contains(target) || (target instanceof Element && target.closest("[aria-haspopup='dialog']"))) return;
      close.current();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const toLeft = spot.x > 55;
  const below = spot.y < 50;
  // 上半分のピンは、ピンのすぐ横から下に向けて出す。下半分のピンは、上に向けると絵に重ねた見出し・季節の切りかえ
  // （絵の上端から 160px。PC の幅によらない）の下にもぐるので、その下から出し、ピンの札（最大で約 8rem）にかからないよう横にずらす
  const gap = below ? "1rem" : "9rem";
  const style = {
    ...(toLeft ? { right: `calc(${100 - spot.x}% + ${gap})` } : { left: `calc(${spot.x}% + ${gap})` }),
    ...(below
      ? { top: `calc(${spot.y}% + 0.5rem)`, maxHeight: `calc(${100 - spot.y}% - 1.5rem)` }
      : { top: "10.5rem", maxHeight: "calc(100% - 11.5rem)" }),
  };

  return (
    <div
      ref={box}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={style}
      className="absolute z-30 flex w-80 flex-col gap-2 overflow-y-auto rounded-card bg-surface p-4 shadow-[0_8px_24px_rgb(43_42_38/0.25)] outline-none motion-safe:animate-fade-in"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SheetEyebrow>{eyebrow}</SheetEyebrow>
          <h2 id={titleId} className="text-xl font-extrabold text-ink">
            {title}
          </h2>
        </div>
        <CloseIconButton onClick={onClose} />
      </div>
      {children}
    </div>
  );
}
