import { describe, expect, it } from "vitest";
import { GALLERY_SPOTS, gallerySections, galleryDepth, neighbourSpots, readGallery, writeGallery } from "./gallery";

const spot = (id: string) => GALLERY_SPOTS.find((item) => item.id === id)!;

describe("飯田の風景を見る：URL（052）", () => {
  it("タブがなければ閉じている", () => {
    expect(readGallery(new URLSearchParams("d=kamisato&q=district"))).toBeNull();
  });

  it("タブと場所を読む。知らないタブは「すべて」、知らない場所は一覧にする", () => {
    expect(readGallery(new URLSearchParams("g=chushin&gs=chushin-station"))).toEqual({ tab: "chushin", spot: spot("chushin-station") });
    expect(readGallery(new URLSearchParams("g=tokyo"))).toEqual({ tab: "all", spot: null });
    // 写真のない場所（準備中）は見比べられない
    expect(readGallery(new URLSearchParams("g=all&gs=kanae-street"))).toEqual({ tab: "all", spot: null });
  });

  it("条件と質問のパラメータは残し、窓の状態だけを書きかえる", () => {
    const params = new URLSearchParams("d=kamisato&a=2&q=district&g=all&gs=kamisato-linear");
    expect(writeGallery(params, { tab: "kamisato", spotId: "kamisato-ishidan" }).toString()).toBe("d=kamisato&a=2&q=district&g=kamisato&gs=kamisato-ishidan");
    expect(writeGallery(params, { tab: "all" }).toString()).toBe("d=kamisato&a=2&q=district&g=all");
    expect(writeGallery(params, null).toString()).toBe("d=kamisato&a=2&q=district");
  });

  it("窓の深さは 閉じている 0・一覧 1・見比べる 2", () => {
    expect(galleryDepth(null)).toBe(0);
    expect(galleryDepth({ tab: "all", spot: null })).toBe(1);
    expect(galleryDepth({ tab: "all", spot: spot("chushin-shrine") })).toBe(2);
  });
});

describe("飯田の風景を見る：一覧と前後の場所（052）", () => {
  it("「すべて」は4地区を上郷・鼎・伊賀良・中心市街地の順に出し、写真のない地区は空にする（画面は準備中）", () => {
    const sections = gallerySections("all");
    expect(sections.map(({ district }) => district)).toEqual(["kamisato", "kanae", "igara", "chushin"]);
    expect(sections.map(({ spots }) => spots.map(({ place }) => place))).toEqual([
      ["飯沼神社", "リニアの高架"],
      [],
      [],
      ["飯田駅", "大宮神社", "ロータリー"],
    ]);
  });

  it("地区のタブはその地区だけを出す", () => {
    expect(gallerySections("chushin").map(({ district }) => district)).toEqual(["chushin"]);
    expect(gallerySections("kanae")).toEqual([{ district: "kanae", spots: [] }]);
  });

  it("「すべて」では全地区を通して順に回り、端まで行ったら反対の端へ", () => {
    expect(neighbourSpots("all", spot("kamisato-linear"))).toEqual({ previous: spot("kamisato-ishidan"), next: spot("chushin-station") });
    expect(neighbourSpots("all", spot("chushin-roundabout")).next).toEqual(spot("kamisato-ishidan"));
    expect(neighbourSpots("all", spot("kamisato-ishidan")).previous).toEqual(spot("chushin-roundabout"));
  });

  it("地区のタブでは、その地区の中で回る", () => {
    expect(neighbourSpots("kamisato", spot("kamisato-linear"))).toEqual({ previous: spot("kamisato-ishidan"), next: spot("kamisato-ishidan") });
    expect(neighbourSpots("chushin", spot("chushin-roundabout")).next).toEqual(spot("chushin-station"));
  });

  it("場所がタブにないときは「すべて」で回る", () => {
    expect(neighbourSpots("kanae", spot("chushin-station"))).toEqual({ previous: spot("kamisato-linear"), next: spot("chushin-shrine") });
  });
});
