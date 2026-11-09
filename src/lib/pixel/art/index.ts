// 絵の id ごとの描き方。PNG の書き出し（scripts/build-pixel.mjs）とテストだけが使う
import type { Canvas } from "../canvas.ts";
import type { PixelAssetId } from "../assets.ts";
import * as icons from "./icons.ts";
import { cultureFestival, festival, noticeBoard, sportsDay } from "./parts.ts";

export const DRAW: Record<PixelAssetId, () => Canvas> = {
  "event-festival": festival,
  "event-sports": sportsDay,
  "event-culture": cultureFestival,
  "event-other": noticeBoard,
  "icon-sprout": icons.sprout,
  "icon-calendar": icons.calendar,
  "icon-book": icons.book,
  "icon-districts": icons.mountainIcon,
  "icon-pin": icons.pin,
  "icon-house": icons.house,
  "icon-car": icons.carIcon,
  "icon-family": icons.family,
  "icon-spring": icons.sakura,
  "icon-summer": icons.umbrella,
  "icon-autumn": icons.maple,
  "icon-winter": icons.snow,
  "icon-chart": icons.chart,
  "icon-map": icons.map,
  "icon-gear": icons.gear,
  "icon-refresh": icons.refresh,
  "icon-school": icons.schoolIcon,
  "icon-disaster": icons.helmet,
  "icon-transport": icons.busIcon,
  "icon-population": icons.people,
  "icon-public": icons.building,
  "icon-support": icons.support,
  "icon-info": icons.info,
  "icon-document": icons.documentIcon,
  "icon-bulb": icons.bulb,
  "icon-checklist": icons.checklist,
  "icon-print": icons.printer,
  logo: icons.logo,
  "deco-grass": icons.grass,
};
