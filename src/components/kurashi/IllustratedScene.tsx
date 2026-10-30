"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { FamilyLayer } from "@/components/illust/FamilyLayer";
import { CloseIconButton, SheetEyebrow } from "@/components/ui/BottomSheet";
import { ILLUST_PICTURES, illustPictureSrc, type KurashiPictureId, type KurashiPictures, type Person } from "@/lib/illust/assets";
import { PIN_SPOTS, type PinId, type PinSpot } from "@/lib/kurashi/pins";
import { ScenePin } from "./ScenePin";

// 生成AIで描いた季節の風景（028 見本。まず上郷・春）。スマホは縦長、PC は横長の絵を出しわけ、
// 広場の奥に選んだ家族を斜め後ろ姿で重ね、場所にピンを立てる。PC はピンを押すと絵の上に吹き出しを出す（スマホは下からのシートで、KurashiView が出す）
export function IllustratedScene({
  pictures,
  label,
  members,
  pins,
  openPin,
  onOpenPin,
  popover,
}: {
  pictures: KurashiPictures;
  // 風景の説明（読み上げ）。家族の構成も入れる
  label: string;
  members: readonly Person[];
  pins: readonly PinId[];
  openPin: PinId | null;
  onOpenPin: (pin: PinId | null) => void;
  // PC の吹き出し（開いているピンの中身）。スマホでは null
  popover: { eyebrow: string; title: string; content: ReactNode } | null;
}) {
  const pinRefs = useRef(new Map<PinId, HTMLButtonElement>());
  const closePopover = () => {
    const pin = openPin;
    onOpenPin(null);
    // 吹き出しを閉じたら、開いたピンに戻る（キーボードで続けて選べるように）
    if (pin) pinRefs.current.get(pin)?.focus();
  };
  const wide = PIN_SPOTS[pictures.wide];
  const tall = PIN_SPOTS[pictures.tall];

  return (
    <figure role="group" aria-label={label} className="relative isolate aspect-[941/1672] overflow-hidden bg-pixel-sky lg:aspect-[1672/941]">
      <ScenePicture pictures={pictures} />
      <div className="absolute inset-0 lg:hidden">
        <FamilyLayer members={members} background={pictures.tall} facing="back" />
      </div>
      <div className="absolute inset-0 hidden lg:block">
        <FamilyLayer members={members} background={pictures.wide} facing="back" />
      </div>
      {pins.map((pin) => (
        <ScenePin
          key={pin}
          ref={(element) => {
            if (element) pinRefs.current.set(pin, element);
            else pinRefs.current.delete(pin);
          }}
          pin={pin}
          tall={tall[pin]}
          wide={wide[pin]}
          active={openPin === pin}
          onOpen={() => onOpenPin(openPin === pin ? null : pin)}
        />
      ))}
      {popover && openPin && (
        <PinPopover key={openPin} spot={wide[openPin]} eyebrow={popover.eyebrow} title={popover.title} onClose={closePopover}>
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

// スマホは縦長、PC は横長の絵（<picture> で幅によって選ばせ、両方は読まない）。説明は figure の名前で読むので飾りにする
function ScenePicture({ pictures }: { pictures: KurashiPictures }) {
  const srcSet = (id: KurashiPictureId) => ILLUST_PICTURES[id].widths.map((w) => `${illustPictureSrc(id, w)} ${w}w`).join(", ");
  const tall = ILLUST_PICTURES[pictures.tall];
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={srcSet(pictures.wide)} sizes="(min-width: 1400px) 1150px, 80vw" />
      {/* 静的書き出しでは next/image の srcset が使えないので <img>（IllustPicture と同じ） */}
      <img
        src={illustPictureSrc(pictures.tall, tall.widths.at(-1)!)}
        srcSet={srcSet(pictures.tall)}
        sizes="100vw"
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
// ピンが絵の右半分にあるときは左に出して、はみ出さないようにする。上半分のピンは下に向けて出し、高さは絵の中に収める
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
  const style = {
    ...(toLeft ? { right: `calc(${100 - spot.x}% + 1rem)` } : { left: `calc(${spot.x}% + 1rem)` }),
    ...(below
      ? { top: `calc(${spot.y}% + 0.5rem)`, maxHeight: `calc(${100 - spot.y}% - 1.5rem)` }
      : { bottom: `calc(${100 - spot.y}% + 3.5rem)`, maxHeight: `calc(${spot.y}% - 4.5rem)` }),
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
