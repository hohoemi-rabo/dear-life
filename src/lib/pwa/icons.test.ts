import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { APP_ICONS, ART_RATIO, ICON_DIR, MASKABLE_SAFE_DIAMETER, appIconArtSize, appIconSrc } from "./icons";

// PNG の先頭（IHDR）から横幅・高さを読む
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(join(process.cwd(), "public", ICON_DIR, file));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("ホーム画面のアイコン（024。2026-11-17 にロゴの家に替えた）", () => {
  it("書き出した PNG は、一覧どおりの正方形", () => {
    for (const icon of Object.values(APP_ICONS)) {
      expect(pngSize(icon.file)).toEqual({ width: icon.px, height: icon.px });
    }
  });

  it("ふつうのアイコンは、家の長いほうを一辺の75%にする", () => {
    expect(appIconArtSize(APP_ICONS.icon512, 458, 445)).toEqual({ width: Math.round(512 * ART_RATIO), height: 373 });
  });

  it("Android の丸い切り抜き用は、家の四すみまで真ん中の円（直径の80%）に収める", () => {
    const icon = APP_ICONS.maskable512;
    const { width, height } = appIconArtSize(icon, 458, 445);
    expect(Math.hypot(width, height) / 2).toBeLessThanOrEqual((icon.px * MASKABLE_SAFE_DIAMETER) / 2 + 1);
  });

  it("manifest は、ふつうのアイコンと切り抜き用のアイコンを分けて渡す", () => {
    const icons = manifest().icons ?? [];
    expect(icons.filter((icon) => icon.purpose === "maskable").map((icon) => icon.src)).toEqual([appIconSrc(APP_ICONS.maskable512)]);
    expect(icons.filter((icon) => icon.purpose === "any").map((icon) => icon.src)).toEqual([
      appIconSrc(APP_ICONS.icon192),
      appIconSrc(APP_ICONS.icon512),
    ]);
  });
});
