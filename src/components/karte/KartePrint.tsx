"use client";

import { DataStateMessage } from "@/components/data/DataStateMessage";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PrintControl, type PrintOption } from "@/components/print/PrintControl";
import { PrintBlock, PrintCheckList, PrintHeader, PrintSection } from "@/components/print/PrintParts";
import { karteLayout } from "@/lib/conditions/karte-order";
import { DISTRICT_NAMES, KARTE_CARD_LABELS, type KarteCard } from "@/lib/conditions/labels";
import { hasNoCar, type Conditions } from "@/lib/conditions/model";
import { checkMemoItems } from "@/lib/karte/check-memo";
import { detailTexts, entryNumber, housingKnows, withDistrict } from "@/lib/karte/details";
import { transportQuestion } from "@/lib/karte/entries";
import { SHITAMI_ITEMS } from "@/lib/karte/shitami-memo";
import { useShitamiMemo } from "@/lib/karte/useShitamiMemo";
import type { DistrictId } from "@/lib/town-district/resolve";
import { BasisTables, housingBasisRows, otherBasisRows, rentBasisRows } from "./DetailBasis";
import { OtherTabPanel, detailTabs, printTabs } from "./DetailPanels";
import { HousingTabFootnote, HousingTabPanel, housingTabs } from "./HousingCard";
import { KarteCardIcon } from "./KarteCardIcon";
import { KarteEntries } from "./KarteEntries";
import { BusReach } from "./ShitamiMemo";

type Chosen = Conditions & { district: DistrictId };

// 印刷で選べるもの：カルテのまとめ（一覧）と7項目（023。2026-11-09 まさゆきさん：項目ごとに選ぶ）と、
// わが家の下見プラン（036。紙でも持っていけるように。メモが空のときは選べるものに出さない）
export type KartePrintItem = "summary" | KarteCard | "shitami";

// カルテ一覧と詳細の見出しの右上に置く「印刷する」。一覧から開くとすべてに、詳細から開くとその項目だけにチェックを入れる。
// ブラウザのメニューから印刷したときは、開いているページの分（一覧ならまとめ、詳細ならその項目）を出す
export function KartePrintButton({ conditions, current }: { conditions: Chosen; current: KarteCard | null }) {
  const { cards } = karteLayout(conditions);
  const shitami = useShitamiMemo(conditions.district);
  const options: PrintOption<KartePrintItem>[] = [
    {
      id: "summary",
      label: "カルテのまとめ（一覧）",
      // 項目の印（24px）と文字の位置をそろえる
      icon: (
        <span className="flex size-6 shrink-0 items-center justify-center">
          <PixelIcon icon="icon-document" size="sm" />
        </span>
      ),
    },
    ...cards.map((card) => ({ id: card, label: KARTE_CARD_LABELS[card], icon: <KarteCardIcon card={card} size="sm" /> })),
    ...(shitami.ids.length > 0
      ? [
          {
            id: "shitami" as const,
            label: "わが家の下見プラン",
            icon: (
              <span className="flex size-6 shrink-0 items-center justify-center">
                <PixelIcon icon="icon-checklist" size="sm" />
              </span>
            ),
          },
        ]
      : []),
  ];
  const all = options.map((option) => option.id);
  return (
    <PrintControl
      options={options}
      initial={current === null ? all : [current]}
      shortcut={current === null ? ["summary"] : [current]}
      renderDocument={(selected) => <KartePrintDocument conditions={conditions} items={selected} />}
    />
  );
}

function KartePrintDocument({ conditions, items }: { conditions: Chosen; items: readonly KartePrintItem[] }) {
  return (
    <ScreenDataBoundary fallback={null}>
      <PrintHeader title="わが家のカルテ" conditions={conditions} />
      {items.map((item, index) => (
        <PrintSection key={item} first={index === 0} label={item === "summary" ? "カルテのまとめ" : item === "shitami" ? "わが家の下見プラン" : KARTE_CARD_LABELS[item]}>
          {item === "summary" ? (
            <SummaryPrint conditions={conditions} />
          ) : item === "shitami" ? (
            <ShitamiPrint conditions={conditions} />
          ) : (
            <CardPrint card={item} conditions={conditions} />
          )}
        </PrintSection>
      ))}
    </ScreenDataBoundary>
  );
}

// まとめ：一覧の見出しの文と、7項目のカード（ボタンは紙では隠す）
function SummaryPrint({ conditions }: { conditions: Chosen }) {
  const layout = karteLayout(conditions);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold">カルテのまとめ</h2>
        <p>{DISTRICT_NAMES[conditions.district]}の暮らしを、ひとつずつ確かめよう。</p>
        {layout.leads.map((lead) => (
          <p key={lead} className="text-sm text-ink-muted">
            {lead}
          </p>
        ))}
      </div>
      <KarteEntries cards={layout.cards} conditions={conditions} memoItems={checkMemoItems(conditions)} highlighted={false} />
    </>
  );
}

// 下見プラン：入れた項目ごとに、名前・バスの便の例・確認点（ペンで印を付ける空の箱）・添え書き。地図などのリンクは紙では使えないので出さない
function ShitamiPrint({ conditions }: { conditions: Chosen }) {
  const data = useScreenData();
  const { ids } = useShitamiMemo(conditions.district);
  const outing = data.districts[conditions.district].busOuting;
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold">わが家の下見プラン</h2>
        <p>{DISTRICT_NAMES[conditions.district]}：飯田に行った日に、見たい・試したいこと。</p>
      </div>
      {ids.map((id) => {
        const item = SHITAMI_ITEMS[id];
        return (
          <PrintBlock key={id} className="flex flex-col gap-3">
            <h3 className="text-lg font-bold">{item.title}</h3>
            <p>{item.summary}</p>
            {item.lead && <p className="text-sm">{item.lead}</p>}
            {id === "bus-to-town" &&
              (outing.status === "available" ? (
                <BusReach districtName={DISTRICT_NAMES[conditions.district]} outing={outing.value} />
              ) : (
                <DataStateMessage state={outing} />
              ))}
            <PrintCheckList title={item.checkTitle} items={item.checks} />
            {item.note && <p className="text-sm">{item.note}</p>}
          </PrintBlock>
        );
      })}
    </>
  );
}

// 1項目：番号と問い → タブの中身をすべて → この数字から分かること → 現地で確かめたいこと（空の箱） → 数字の根拠
function CardPrint({ card, conditions }: { card: KarteCard; conditions: Chosen }) {
  const data = useScreenData();
  const district = data.districts[conditions.district];
  const districtName = DISTRICT_NAMES[conditions.district];
  const { cards } = karteLayout(conditions);
  const texts = detailTexts(card, { housing: conditions.housing, transportQuestion: transportQuestion(conditions.car) });

  let panels;
  let knows = texts.knows;
  let basis;
  if (card === "housing") {
    const tabs = housingTabs(conditions.housing);
    // 「この数字から分かること」は選んだ家のタブの分（画面で最初に開くタブと同じ）
    if (tabs[0].category !== null) knows = housingKnows(tabs[0].category);
    panels = tabs.map((tab) => (
      <PrintBlock key={tab.id} className="flex flex-col gap-3">
        <h3 className="font-bold">{tab.label}</h3>
        <HousingTabPanel district={district} rent={data.rent} housing={conditions.housing} tab={tab} />
        <HousingTabFootnote tab={tab} />
      </PrintBlock>
    ));
    basis = tabs.flatMap((tab) =>
      tab.category === null ? rentBasisRows(data.rent, district.housingTenure, districtName) : housingBasisRows(district, districtName, tab.category),
    );
  } else {
    const noCar = hasNoCar(conditions);
    const tabs = printTabs(card, detailTabs(card, { district, supportPrograms: data.supportPrograms, noCar }));
    panels = tabs.map((tab) => (
      <PrintBlock key={tab.id} breakable className="space-y-3">
        {tabs.length > 1 && <h3 className="break-after-avoid font-bold">{tab.label}</h3>}
        <OtherTabPanel card={card} tab={tab} district={district} supportPrograms={data.supportPrograms} noCar={noCar} />
      </PrintBlock>
    ));
    basis = otherBasisRows(card, tabs);
  }

  return (
    <>
      <div className="flex break-after-avoid flex-col gap-1">
        <p className="flex items-center gap-2 font-bold">
          <KarteCardIcon card={card} size="sm" />
          項目{entryNumber(cards, card)}　{KARTE_CARD_LABELS[card]}
        </p>
        <h2 className="text-xl font-extrabold">{texts.question.long}</h2>
      </div>
      {panels}
      <PrintBlock className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 font-bold">
          <PixelIcon icon="icon-bulb" size="sm" />
          この数字から分かること
        </h3>
        <p className="font-bold">{withDistrict(knows, districtName)}</p>
        <p className="text-sm">
          <span className="font-bold">{texts.tip.title}</span>
          {texts.tip.body}
        </p>
      </PrintBlock>
      <PrintCheckList title={texts.checkTitle} items={texts.checks} />
      <PrintBlock className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 font-bold">
          <PixelIcon icon="icon-document" size="sm" />
          数字の根拠（出典・対象・確認日）
        </h3>
        <BasisTables rows={basis} note={texts.basisNote} />
      </PrintBlock>
    </>
  );
}
