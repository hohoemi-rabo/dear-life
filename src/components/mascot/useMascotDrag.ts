"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

// くらしの絵の上のぽてりを、さわって動かす（046。2026-11-20 まさゆきさん）。
// PC（マウス）はつかんでドラッグ、スマホ（指）は約0.4秒押しっぱなしで持ち上げてから動かす。さっと押して離したときはパレットを開く（クリックのまま）。
// 動かせるのは絵の中だけ。動かした場所は覚えない（地区・季節を切りかえる・開き直すと、地区ごとに選んだ元の場所に戻る）

// 指で持ち上げるまでの長さ
export const LIFT_DELAY_MS = 400;
// マウスでこれより動かしたら「動かした」とみなす（クリックのときの手のぶれは数えない）
const MOUSE_DRAG_THRESHOLD_PX = 3;
// 持ち上げる前に指がこれより動いたら、ふつうのスクロールにする（絵の上をなぞってスクロールする人のじゃまをしない）
const TOUCH_SCROLL_THRESHOLD_PX = 10;
// PC の絵（横長）に切りかえる幅。IllustratedScene・ScenePin の lg と同じ
const WIDE_MEDIA = "(min-width: 1024px)";
// 絵の上に重ねた見出し・季節の切りかえ（KurashiView）。ここにもぐると押せなくなる（取り出せない）ので、この下までにする
const COVER_SELECTOR = "[data-mascot-cover]";

// 動かした足元の場所。絵に対する割合（％）。wide は PC の絵（横長）の上で動かしたか（スマホの縦長の絵とは構図が違うので、その絵にだけ当てる）。
// key はどの地区・季節の絵の上で動かしたか。切りかえたら元の場所に戻す
type DraggedSpot = { key: string; x: number; y: number; wide: boolean };

type Gesture = {
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  // 足元の場所（絵の左上から px）と、絵・ぽてりの大きさ（押した時点）
  footX: number;
  footY: number;
  frameWidth: number;
  frameHeight: number;
  // 絵の上端から、重ねた見出しの下端まで（px）。見出しがなければ 0
  coverBottom: number;
  width: number;
  height: number;
  wide: boolean;
  moving: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

export type MascotDrag = {
  // 押せるボタンに付ける
  buttonProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
    style: CSSProperties | undefined;
  };
  // 持ち上げている間
  lifted: boolean;
  // 離して、はねて着地している間
  landing: boolean;
  onLandingEnd: () => void;
  // 動かした場所（CSS の変数）。動かしていなければ undefined
  spotStyle: CSSProperties | undefined;
  // 今の押す操作で動かしたか。動かしたあとのクリックではパレットを開かない
  consumeClick: () => boolean;
};

// root：ぽてりの外側の箱（絵の中に absolute で置いた要素）。button：押せるボタン。onLift：持ち上げたとき（パレットを閉じる）。
// shown：ぽてりを出しているか（絵を読み終えるまではボタンがないので、出してからスクロールを止める仕組みを付ける）
export function useMascotDrag({
  enabled,
  shown,
  resetKey,
  root,
  button,
  onLift,
}: {
  enabled: boolean;
  shown: boolean;
  resetKey: string;
  root: RefObject<HTMLElement | null>;
  button: RefObject<HTMLButtonElement | null>;
  onLift: () => void;
}): MascotDrag {
  const [dragged, setDragged] = useState<DraggedSpot | null>(null);
  const [lifted, setLifted] = useState(false);
  const [landing, setLanding] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const liftedRef = useRef(false);
  const movedThisPress = useRef(false);
  const lift = useRef(onLift);
  lift.current = onLift;

  const setLiftedBoth = (value: boolean) => {
    liftedRef.current = value;
    setLifted(value);
  };

  // 持ち上げている間は、指を動かしてもページをスクロールさせない。持ち上げる前に始まったスクロールは止めない。
  // React の onTouchMove は passive で preventDefault が効かないので、ボタンに直接付ける
  useEffect(() => {
    const element = button.current;
    if (!enabled || !shown || element === null) return;
    const onTouchMove = (event: TouchEvent) => {
      if (liftedRef.current && event.cancelable) event.preventDefault();
    };
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => element.removeEventListener("touchmove", onTouchMove);
  }, [enabled, shown, button]);

  // 画面を離れるときに、持ち上げるのを待っているタイマーを止める
  useEffect(
    () => () => {
      if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    },
    [],
  );

  const startMoving = (current: Gesture) => {
    current.moving = true;
    movedThisPress.current = true;
    setLanding(false);
    setLiftedBoth(true);
    lift.current();
  };

  const finish = (pointerId: number) => {
    const current = gesture.current;
    if (current === null || current.pointerId !== pointerId) return;
    if (current.timer) clearTimeout(current.timer);
    gesture.current = null;
    if (current.moving) {
      setLiftedBoth(false);
      setLanding(true);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0) return;
    const element = root.current;
    const frame = element?.parentElement;
    if (!element || !frame) return;
    movedThisPress.current = false;
    if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    const box = element.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const touch = event.pointerType === "touch";
    const current: Gesture = {
      pointerId: event.pointerId,
      touch,
      startX: event.clientX,
      startY: event.clientY,
      footX: box.left + box.width / 2 - frameBox.left,
      footY: box.bottom - frameBox.top,
      frameWidth: frameBox.width,
      frameHeight: frameBox.height,
      coverBottom: coverBottomIn(frameBox),
      width: box.width,
      height: box.height,
      wide: typeof window.matchMedia === "function" && window.matchMedia(WIDE_MEDIA).matches,
      moving: false,
      timer: null,
    };
    if (touch) {
      current.timer = setTimeout(() => {
        current.timer = null;
        if (gesture.current === current) startMoving(current);
      }, LIFT_DELAY_MS);
    } else {
      // マウスでつかんだまま絵の外に出ても動かし続ける。押したときに文字の選択が始まらないようにする
      // （フォーカスはボタンに移らなくなるが、パレットはクリックで開き、閉じたらボタンに戻す）
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    gesture.current = current;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moving) {
      const distance = Math.hypot(dx, dy);
      if (current.touch) {
        // 持ち上げる前に指が動いた：スクロールに任せる
        if (distance > TOUCH_SCROLL_THRESHOLD_PX) {
          if (current.timer) clearTimeout(current.timer);
          gesture.current = null;
        }
        return;
      }
      if (distance <= MOUSE_DRAG_THRESHOLD_PX) return;
      startMoving(current);
    }
    setDragged({ key: resetKey, wide: current.wide, ...footSpot(current, dx, dy) });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => finish(event.pointerId);

  const visible = dragged !== null && dragged.key === resetKey ? dragged : null;

  return {
    buttonProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      // Android の長押しで出るメニューを出さない
      onContextMenu: (event) => {
        if (enabled) event.preventDefault();
      },
      // iPhone の長押しで出る保存のメニュー・文字の選択を出さない。持ち上げている間はスクロールさせない
      style: enabled
        ? ({ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", touchAction: lifted ? "none" : undefined } as CSSProperties)
        : undefined,
    },
    lifted,
    landing,
    onLandingEnd: () => setLanding(false),
    spotStyle: visible === null ? undefined : draggedSpotStyle(visible),
    consumeClick: () => {
      const moved = movedThisPress.current;
      movedThisPress.current = false;
      return moved;
    },
  };
}

// 動かしたあとの足元（絵に対する％）。ぽてりが絵の外にはみ出さないよう、左右は体の半分、上は体の高さだけ内側に収める。
// 上は、絵に重ねた見出しの下まで
function footSpot(gesture: Gesture, dx: number, dy: number): { x: number; y: number } {
  const { frameWidth, frameHeight, width, height, coverBottom } = gesture;
  if (frameWidth <= 0 || frameHeight <= 0) return { x: 0, y: 0 };
  const x = clamp(gesture.footX + dx, width / 2, frameWidth - width / 2);
  const y = clamp(gesture.footY + dy, coverBottom + height, frameHeight);
  return { x: (x / frameWidth) * 100, y: (y / frameHeight) * 100 };
}

function coverBottomIn(frameBox: DOMRect): number {
  const cover = document.querySelector(COVER_SELECTOR);
  if (cover === null) return 0;
  return Math.max(0, cover.getBoundingClientRect().bottom - frameBox.top);
}

function clamp(value: number, min: number, max: number): number {
  // 絵がぽてりより小さいときは真ん中に置く
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

// 動かした絵（スマホの縦長か PC の横長）の側の置き場所の変数だけを替える（Mascot の --mascot-x・--mascot-x-lg）
function draggedSpotStyle(spot: DraggedSpot): CSSProperties {
  const suffix = spot.wide ? "-lg" : "";
  return { [`--mascot-x${suffix}`]: `${round(spot.x)}%`, [`--mascot-y${suffix}`]: `${round(spot.y)}%` } as CSSProperties;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
