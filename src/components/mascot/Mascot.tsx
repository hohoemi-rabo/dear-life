"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { CloseIconButton } from "@/components/ui/BottomSheet";
import { mascotSrc, type MascotMotionId } from "@/lib/mascot/assets";
import { APRON_COLOR_IDS, APRON_COLORS, apronSwatch, recolorApron, type ApronColorId } from "@/lib/mascot/recolor";
import type { MascotSpot } from "@/lib/mascot/spots";
import { MASCOT_SPRITES } from "@/lib/mascot/sprites";
import { useApronColor } from "@/lib/mascot/useApronColor";

// マスコット（042）。移住とは関係ないが、なんか気になって見たくなるもの（2026-11-15 まさゆきさん）。
// 絵の上に「気づくか気づかないか」くらいの小ささで置き、地区ごとのしぐさで動かす（服装は季節で替わる）。押すと服の色のパレットを出し、
// 選んだ色は端末に残す（くらし・カルテ・地区くらべで同じ色になる）。
// 動きはコマを横に並べた1枚の絵を順にずらして出す。「動きを減らす」では最初のコマで止める。印刷には出さない。

// くらしの絵の上に置くとき。位置はスマホ（縦長の絵）と PC（横長の絵）で別に持ち、CSS の変数で切りかえる（ScenePin と同じ）。ピンより下に重ねる
export function Mascot({ motion, wide, tall }: { motion: MascotMotionId; wide: MascotSpot; tall: MascotSpot }) {
  const style = {
    "--mascot-x": `${tall.x}%`,
    "--mascot-y": `${tall.y}%`,
    "--mascot-h": `${tall.height}%`,
    "--mascot-x-lg": `${wide.x}%`,
    "--mascot-y-lg": `${wide.y}%`,
    "--mascot-h-lg": `${wide.height}%`,
  } as CSSProperties;
  return (
    <MascotFigure
      motion={motion}
      style={style}
      className="absolute left-[var(--mascot-x)] top-[var(--mascot-y)] h-[var(--mascot-h)] -translate-x-1/2 -translate-y-full lg:left-[var(--mascot-x-lg)] lg:top-[var(--mascot-y-lg)] lg:h-[var(--mascot-h-lg)]"
    />
  );
}

// マスコット1つ。置き場所と高さは className（と style）で渡す（位置を持つ要素にする。absolute か relative）。
// 幅は高さと絵の縦横の比で決まる。paletteSide はパレットをマスコットのどちらに出すか
export function MascotFigure({
  motion,
  className,
  style,
  paletteSide = "left",
}: {
  motion: MascotMotionId;
  className: string;
  style?: CSSProperties;
  paletteSide?: "left" | "right";
}) {
  const [color, setColor] = useApronColor();
  const sheet = useRecoloredSheet(motion, color);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const sprite = MASCOT_SPRITES[motion];

  // 絵を読み終えるまで出さない（元の色の絵が一瞬見えてから色が替わらないように）
  if (sheet === null) return null;

  const spriteStyle = {
    aspectRatio: `${sprite.frameWidth} / ${sprite.frameHeight}`,
    backgroundImage: `url(${sheet})`,
    backgroundSize: `${sprite.frames * 100}% 100%`,
    "--mascot-frames": sprite.frames,
    "--mascot-duration": `${sprite.frames * sprite.frameMs}ms`,
  } as CSSProperties;

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div style={style} className={`${className} print:hidden ${open ? "z-30" : "z-10"}`}>
      <span aria-hidden="true" style={spriteStyle} className="block h-full bg-no-repeat motion-safe:animate-mascot" />
      {/* 押せる範囲は 44px 以上。絵は小さいので、絵に重ねた透明なボタンを、足元をそろえたまま 44px まで広げる（絵は広げない） */}
      <button
        ref={button}
        type="button"
        aria-label="マスコット。押すと服の色を変えられます"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="absolute bottom-0 left-1/2 size-full min-h-tap min-w-tap -translate-x-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      {open && <ApronPalette id={panelId} side={paletteSide} color={color} onSelect={setColor} onClose={close} />}
    </div>
  );
}

// 服の色のパレット（はじめは夏のエプロンだけだったので、色の名前などのコードは apron のまま）。マスコットの横（くらしの絵の上では左。
// どの地区も絵の右寄りに置くため）に、マスコットの頭の高さから下に向けて出す（上に向けると、絵の上に重ねた見出し・季節の切りかえの下にもぐる）。
// ×・Esc・パレットの外を押すと閉じる
function ApronPalette({
  id,
  side,
  color,
  onSelect,
  onClose,
}: {
  id: string;
  side: "left" | "right";
  color: ApronColorId;
  onSelect: (color: ApronColorId) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("[aria-pressed='true']")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // マスコットを押したときは、マスコットの側で開け閉めする
      if (panel.current?.parentElement?.contains(target)) return;
      close.current();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div
      ref={panel}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      className={`absolute top-0 w-max rounded-card ${side === "left" ? "right-full mr-2" : "left-full ml-2"} bg-surface p-3 shadow-[0_8px_24px_rgb(43_42_38/0.25)] motion-safe:animate-fade-in`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-sm font-bold text-ink">
          服の色
        </h2>
        <CloseIconButton onClick={onClose} />
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {APRON_COLOR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-label={APRON_COLORS[id].label}
            aria-pressed={id === color}
            onClick={() => onSelect(id)}
            className="flex size-11 items-center justify-center rounded-full transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: apronSwatch(id) }}
              className={`block size-9 rounded-full border-2 ${id === color ? "border-ink ring-2 ring-surface ring-offset-2 ring-offset-ink" : "border-surface shadow-card"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// 動きの1枚の絵を読み、服の色を替えた絵の URL を返す。読み終えるまでは null。
// 青緑（元の色）と、canvas を使えない環境では元の絵をそのまま使う。
// 色を替えた直後は、新しい色の絵ができるまで前の色の絵を出し続ける（消えて現れるとちらつく）。前の絵の URL は、新しい絵に替えてから手放す
function useRecoloredSheet(motion: MascotMotionId, color: ApronColorId): string | null {
  const [sheet, setSheet] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const src = mascotSrc(motion);
    const show = (url: string, owned: boolean) => {
      if (cancelled) {
        if (owned) URL.revokeObjectURL(url);
        return;
      }
      const previous = objectUrl.current;
      objectUrl.current = owned ? url : null;
      setSheet(url);
      if (previous !== null) URL.revokeObjectURL(previous);
    };
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      const recolored = color === "teal" ? null : recolorImage(image, color);
      if (recolored === null) show(src, false);
      else recolored.then((blob) => (blob === null ? show(src, false) : show(URL.createObjectURL(blob), true)));
    };
    // 読めないとき（圏外で、まだ端末に残っていないなど）は出さない。マスコットはなくても困らない
    image.onerror = () => {
      if (!cancelled) setSheet(null);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [motion, color]);

  // 画面を離れるときに、最後の絵の URL を手放す
  useEffect(
    () => () => {
      if (objectUrl.current !== null) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  return sheet;
}

function recolorImage(image: HTMLImageElement, color: ApronColorId): Promise<Blob | null> | null {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) return null;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  recolorApron(pixels.data, color);
  context.putImageData(pixels, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
}
