import type { MetadataRoute } from "next";
import { APP_ICONS, appIconSizes, appIconSrc } from "@/lib/pwa/icons";
import { SITE_CATCHPHRASE, SITE_NAME, SITE_NAME_JA, THEME_COLOR } from "@/lib/site";

// 静的書き出しでは、ビルド時に manifest.webmanifest として書き出す
export const dynamic = "force-static";

// ホーム画面に追加したときの名前・アイコン・色（要件 8.2）。アドレスバーを出さずに開く
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} ${SITE_NAME_JA}`,
    short_name: SITE_NAME,
    description: SITE_CATCHPHRASE,
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    icons: [
      { src: appIconSrc(APP_ICONS.icon192), sizes: appIconSizes(APP_ICONS.icon192), type: "image/png", purpose: "any" },
      { src: appIconSrc(APP_ICONS.icon512), sizes: appIconSizes(APP_ICONS.icon512), type: "image/png", purpose: "any" },
      // Android が丸く切り抜く用。家を小さめにして、真ん中の円に収めてある
      { src: appIconSrc(APP_ICONS.maskable512), sizes: appIconSizes(APP_ICONS.maskable512), type: "image/png", purpose: "maskable" },
    ],
  };
}
