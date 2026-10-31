"use client";

import { useState, type CSSProperties } from "react";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { kurashiPicturesFor, type KurashiPictures } from "@/lib/illust/assets";
import { familyMembers } from "@/lib/illust/family";
import { karteHref } from "@/lib/kurashi/links";
import { pinSheet } from "@/lib/kurashi/pin-sheets";
import { PIN_SPOTS, pinsFor, type PinId } from "@/lib/kurashi/pins";
import { useSeason } from "@/lib/kurashi/useSeason";
import { seasonView } from "@/lib/kurashi/view";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { ConditionsSheet } from "./ConditionsSheet";
import { EventCard } from "./EventCard";
import { HomeCard } from "./HomeCard";
import { IllustratedScene } from "./IllustratedScene";
import { KurashiTabBar } from "./KurashiTabBar";
import { PinSheetContent } from "./PinSheetContent";
import { SCENE_WIDTH_CLASS, ScenePanel } from "./ScenePanel";
import { SceneHeading } from "./SceneHeading";
import { SeasonThumbnails } from "./SeasonThumbnails";
import { useWideScreen } from "./useWideScreen";

type Chosen = Conditions & { district: DistrictId };

// 02 くらしを見る（F-11〜F-14・F-04。028 見本）。条件と季節は URL パラメータに持つ（F-02）。useSearchParams を使うので <Suspense> の中で使う。
// 風景の絵がある場面（まず上郷・春）は、風景を主役にしてピンを立て、ピンを押すとその場所のデータを出す（スマホは下からのシート、PC は吹き出し）。
// 絵がまだない地区・季節は、今のドット絵と場面の文（ScenePanel）を同じ枠の中で出す。
// スマホは下に「くらし・カルテ・地区くらべ・地図」のタブ、PC は左に「わが家」を置く
export function KurashiView() {
  const { conditions, setConditions } = useConditions();
  const { season, setSeason } = useSeason();
  const [openPin, setOpenPin] = useState<PinId | null>(null);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const { district } = conditions;
  if (district === null) return <NoDistrict conditions={conditions} />;

  const chosen: Chosen = { ...conditions, district };
  const pictures = kurashiPicturesFor(district, season);
  const changeSeason = (next: Season) => {
    setOpenPin(null);
    setSeason(next);
  };
  const heading = (
    <SceneHeading
      conditions={chosen}
      season={season}
      onSeasonChange={changeSeason}
      onChangeConditions={() => setConditionsOpen(true)}
      hasPins={pictures !== null}
    />
  );

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside aria-label="わが家" className="hidden lg:sticky lg:top-4 lg:block">
        <HomeCard conditions={chosen} onChangeConditions={() => setConditionsOpen(true)} />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        {pictures ? (
          // 風景の絵は画面の端まで広げる（スマホ）。見出し・条件の札・季節の切りかえは絵の空の上に重ねる（見本）。
          // スマホは重ねるものが多く空からはみ出すので、絵の上に空と同じ色の帯を少し足し、絵を見出しの下にもぐらせる
          // （もぐらせる量は幅に対する％＝絵の高さの約3割。空と雪山の範囲）
          <section
            aria-label="季節の場面"
            style={skyStyle(pictures)}
            className="-mx-4 -mt-6 flex flex-col bg-[var(--sky)] lg:relative lg:mx-0 lg:mt-0 lg:overflow-hidden lg:rounded-card lg:bg-none lg:shadow-card"
          >
            <div className="relative z-30 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.8),rgb(255_255_255/0.45)_65%,transparent)] px-4 pb-3 pt-3 lg:absolute lg:inset-x-0 lg:top-0 lg:pb-8 lg:pt-6">
              {heading}
            </div>
            <div className="-mt-[37%] lg:mt-0">
              <ScreenDataBoundary fallback={<Skeleton className="aspect-[1122/1402] w-full rounded-none lg:aspect-[3/2]" />}>
                <SceneWithPins pictures={pictures} season={season} conditions={chosen} openPin={openPin} onOpenPin={setOpenPin} />
              </ScreenDataBoundary>
            </div>
          </section>
        ) : (
          <section aria-label="季節の場面" className="flex flex-col gap-4">
            {heading}
            <ScreenDataBoundary fallback={<SceneSkeleton />}>
              <ScenePanel season={season} conditions={chosen} />
            </ScreenDataBoundary>
          </section>
        )}

        <ScreenDataBoundary fallback={<Skeleton className="h-28" />}>
          <BelowScene
            pictures={pictures}
            season={season}
            conditions={chosen}
            onOpenEvents={() => setOpenPin("event")}
            onSeasonChange={changeSeason}
          />
        </ScreenDataBoundary>

        {/* 絵がない場面の行事（下の「春の楽しみ」から開く）は、PC でも下からのシートで出す */}
        {!pictures && (
          <ScreenDataBoundary fallback={null}>
            <PinBottomSheet pin={openPin} pictures={null} season={season} conditions={chosen} onClose={() => setOpenPin(null)} />
          </ScreenDataBoundary>
        )}
      </div>

      <KurashiTabBar conditions={chosen} season={season} />
      <ConditionsSheet
        open={conditionsOpen}
        onClose={() => setConditionsOpen(false)}
        conditions={chosen}
        onDistrictChange={(next) => {
          setOpenPin(null);
          setConditions({ district: next });
        }}
      />
    </div>
  );
}

// スマホの縦長の絵のいちばん上の空の色。絵の上に足す帯を、切れ目なく絵につなげる
const SKY_COLORS: Partial<Record<KurashiPictures["tall"], string>> = {
  "kurashi-kamisato-spring-tall": "#35A2FC",
};

function skyStyle(pictures: KurashiPictures): CSSProperties {
  return { "--sky": SKY_COLORS[pictures.tall] ?? "#D9EDFC" } as CSSProperties;
}

function useSeasonView(season: Season, conditions: Chosen) {
  return seasonView(season, conditions, useScreenData());
}

// 風景とピン。スマホのシートもここで出す（PC は IllustratedScene の吹き出し）。ScreenDataBoundary の中で使う
function SceneWithPins({
  pictures,
  season,
  conditions,
  openPin,
  onOpenPin,
}: {
  pictures: KurashiPictures;
  season: Season;
  conditions: Chosen;
  openPin: PinId | null;
  onOpenPin: (pin: PinId | null) => void;
}) {
  const view = useSeasonView(season, conditions);
  const wide = useWideScreen();
  const pins = pinsFor(view.plan, conditions);
  const sheet = openPin ? pinSheet({ pin: openPin, season, conditions, ...view }) : null;
  const label = `${view.district.name}の${season}の風景（イメージ）。家族：${familyLabel(conditions)}。場所を押すと、その場所のデータが出ます`;
  return (
    <>
      <IllustratedScene
        pictures={pictures}
        label={label}
        members={familyMembers(conditions)}
        pins={pins}
        openPin={openPin}
        onOpenPin={onOpenPin}
        popover={
          wide && sheet
            ? {
                eyebrow: "暮らしの発見",
                title: sheet.title,
                content: (
                  <PinSheetContent sheet={sheet} season={season} conditions={conditions} thumbnail={{ picture: pictures.wide, spot: PIN_SPOTS[pictures.wide][sheet.id] }} compact />
                ),
              }
            : null
        }
      />
      {!wide && <PinBottomSheet pin={openPin} pictures={pictures} season={season} conditions={conditions} onClose={() => onOpenPin(null)} />}
    </>
  );
}

// ピンの中身を下からのシートで出す（スマホ。絵がない場面の行事は PC でも）
function PinBottomSheet({
  pin,
  pictures,
  season,
  conditions,
  onClose,
}: {
  pin: PinId | null;
  pictures: KurashiPictures | null;
  season: Season;
  conditions: Chosen;
  onClose: () => void;
}) {
  const view = useSeasonView(season, conditions);
  const sheet = pin ? pinSheet({ pin, season, conditions, ...view }) : null;
  return (
    <BottomSheet open={sheet !== null} onClose={onClose} title={sheet?.title ?? ""} eyebrow="暮らしの発見" variant="discovery" closeLabel="風景にもどる">
      {sheet && (
        <PinSheetContent
          sheet={sheet}
          season={season}
          conditions={conditions}
          thumbnail={pictures ? { picture: pictures.wide, spot: PIN_SPOTS[pictures.wide][sheet.id] } : null}
        />
      )}
    </BottomSheet>
  );
}

// 場面の下（見本）：「春の楽しみ」の行事と「わが家のカルテへ」。PC は1枚の帯にして、右に4季節の絵を並べる。
// どの季節からでもカルテに移れる（F-14）。ScreenDataBoundary の中で使う
function BelowScene({
  pictures,
  season,
  conditions,
  onOpenEvents,
  onSeasonChange,
}: {
  pictures: KurashiPictures | null;
  season: Season;
  conditions: Chosen;
  onOpenEvents: () => void;
  onSeasonChange: (season: Season) => void;
}) {
  const { events } = useSeasonView(season, conditions);
  const karte = karteHref(conditions, season);
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center lg:gap-5 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-4 lg:shadow-card">
      <EventCard
        season={season}
        events={events}
        thumbnail={pictures ? { picture: pictures.wide, spot: PIN_SPOTS[pictures.wide].event } : null}
        onOpen={onOpenEvents}
        heading
      />
      <div className="flex flex-col gap-2 lg:border-l lg:border-line lg:pl-5">
        <p className="hidden font-bold lg:block">暮らしの根拠も、確かめる。</p>
        <ButtonLink href={karte} className="w-full rounded-full">
          わが家のカルテへ
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </div>
      <div className="hidden lg:block">
        <SeasonThumbnails season={season} conditions={conditions} onSelect={onSeasonChange} />
      </div>
    </div>
  );
}

function NoDistrict({ conditions }: { conditions: Conditions }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-extrabold">くらしを見る</h1>
      <Card className="flex flex-col items-start gap-3">
        <p>住む地区がまだ選ばれていません。「01 えらぶ」で地区を選ぶと、その地区の春夏秋冬の場面が見られます。</p>
        <ButtonLink href={conditionsHref(ERABU_PATH, conditions)}>
          地区をえらぶ
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </Card>
    </div>
  );
}

function SceneSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col items-center gap-4">
      <span className="sr-only">場面を読み込んでいます</span>
      <Skeleton className={`aspect-[16/9] ${SCENE_WIDTH_CLASS}`} />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
