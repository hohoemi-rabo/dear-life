// マスコット（042）のエプロンの色を替える。動きの1枚の WebP の点のうち、エプロンの青緑の点だけを選び、
// 明るさ（影・布の質感）を残したまま色みだけを替える。動きは青緑の1本だけを用意してもらい、色はここで何色にでもする（2026-11-15 まさゆきさん）。
// エプロンの青緑は rgb(95, 119, 110) 前後（色相 約157°・彩度が低い）、体のクリーム色は色相 約33°、ほうきは茶色なので、色相で分けられる
// （用意してもらうときに、エプロンのほかに青緑・青を使わないように頼んである）

export const APRON_COLOR_IDS = ["teal", "red", "yellow", "pink", "purple", "navy"] as const;
export type ApronColorId = (typeof APRON_COLOR_IDS)[number];

// hue は色相（度）、saturation は彩度（0〜1）、lightness は明るさに掛ける数（黄色・ピンクは元のままだと暗くくすむので明るくする）。
// teal は元の色のまま（置きかえない）
export type ApronColor = { id: ApronColorId; label: string; hue: number; saturation: number; lightness: number };

export const APRON_COLORS: Readonly<Record<ApronColorId, ApronColor>> = {
  teal: { id: "teal", label: "青緑", hue: 157, saturation: 0.11, lightness: 1 },
  red: { id: "red", label: "赤", hue: 4, saturation: 0.6, lightness: 1.05 },
  yellow: { id: "yellow", label: "黄色", hue: 44, saturation: 0.75, lightness: 1.35 },
  pink: { id: "pink", label: "ピンク", hue: 340, saturation: 0.55, lightness: 1.35 },
  purple: { id: "purple", label: "紫", hue: 272, saturation: 0.35, lightness: 1.1 },
  navy: { id: "navy", label: "紺", hue: 222, saturation: 0.45, lightness: 0.85 },
};

export const DEFAULT_APRON_COLOR: ApronColorId = "teal";

// エプロンとみなす色相の範囲と、彩度のしきい値。彩度がしきい値から FADE だけ上までは少しずつ替え、エプロンと体のさかいの点に青緑を残さない
const APRON_HUE_MIN = 110;
const APRON_HUE_MAX = 230;
const APRON_SATURATION_MIN = 0.03;
const APRON_SATURATION_FADE = 0.05;
// エプロンのふつうの明るさ（パレットの見本の色に使う）
const APRON_TYPICAL_LIGHTNESS = 0.42;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [f(0), f(8), f(4)];
}

// どれだけエプロンの点か（0〜1）
function apronWeight(h: number, s: number): number {
  if (h < APRON_HUE_MIN || h > APRON_HUE_MAX) return 0;
  return Math.max(0, Math.min(1, (s - APRON_SATURATION_MIN) / APRON_SATURATION_FADE));
}

// RGBA の点の並び（canvas の ImageData.data）のエプロンの色を、その場で替える。teal はなにもしない
export function recolorApron(data: Uint8ClampedArray, colorId: ApronColorId): void {
  if (colorId === "teal") return;
  const color = APRON_COLORS[colorId];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const weight = apronWeight(h, s);
    if (weight === 0) continue;
    const [r, g, b] = hslToRgb(color.hue, color.saturation, Math.min(0.92, l * color.lightness));
    data[i] = Math.round(data[i] + (r - data[i]) * weight);
    data[i + 1] = Math.round(data[i + 1] + (g - data[i + 1]) * weight);
    data[i + 2] = Math.round(data[i + 2] + (b - data[i + 2]) * weight);
  }
}

// パレットの丸に塗る色（エプロンのふつうの明るさのところの色）
export function apronSwatch(colorId: ApronColorId): string {
  const color = APRON_COLORS[colorId];
  const lightness = colorId === "teal" ? APRON_TYPICAL_LIGHTNESS : Math.min(0.92, APRON_TYPICAL_LIGHTNESS * color.lightness);
  const [r, g, b] = hslToRgb(color.hue, color.saturation, lightness);
  return `rgb(${r} ${g} ${b})`;
}

export function isApronColorId(value: unknown): value is ApronColorId {
  return typeof value === "string" && (APRON_COLOR_IDS as readonly string[]).includes(value);
}
