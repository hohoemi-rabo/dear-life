import Link from "next/link";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateLegend } from "@/components/data/DataStateMessage";
import { ButtonLink } from "@/components/ui/Button";
import { SourceNote } from "@/components/ui/SourceNote";
import type { DistrictData, ScreenData } from "@/lib/data/screen-data";
import type { Conditions } from "@/lib/conditions/model";
import { compareSources, COMPARE_TABS, eventSources, sourcesSummary, type CompareTab } from "@/lib/kurabe/compare";
import type { CompareTarget, CompareView } from "@/lib/kurabe/links";
import { ABOUT_DATA_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CityCompareView } from "./CityCompareView";
import { RowLabel, RowStack, SelectedMark } from "./CompareLayouts";
import { CompareModeSwitch, DistrictPicker, RowPair } from "./ComparePair";
import { KurabeIcon, type KurabeIconName } from "./KurabeIcon";
import { COMPARE_TOPIC_CONTENTS, type CompareTopicContent } from "./rows";

type Props = {
  data: ScreenData;
  topic: CompareTab;
  selected: DistrictId | null;
  hrefFor: (view: CompareView) => string;
  onSelect: (topic: CompareTab) => void;
  target: CompareTarget;
  onTargetChange: (target: CompareTarget | null) => void;
  // いまの街と（041）
  cityId: string | null;
  onCityChange: (cityId: string) => void;
  conditions: Pick<Conditions, "adults" | "children" | "parent">;
  erabuHref: string;
};

const PANEL_ID = "kurabe-topic-panel";
const tabId = (topic: CompareTab) => `kurabe-tab-${topic}`;

type TabItem = { id: CompareTab; tabLabel: string; tabLabelRest?: string; icon: KurabeIconName; nextText: string };

// タブの並び。4地区の5つのあとに「いまの街と」（041 見本 kurabe-city-pc.png）。下の帯の「次のタブ」もこの順に回る
const TAB_ITEMS: readonly TabItem[] = COMPARE_TABS.map(
  (id): TabItem =>
    id === "city"
      ? { id, tabLabel: "いまの街と", icon: "building", nextText: "住まいの相場も同じ4地区で比べられます。" }
      : (COMPARE_TOPIC_CONTENTS.find((content) => content.id === id) as CompareTopicContent),
);

function nextButtonLabel(item: TabItem): string {
  return item.id === "city" ? "いまの街とくらべる" : `${item.tabLabel}${item.tabLabelRest ?? ""}を比べる`;
}

// 比べたい項目をタブで切りかえる（PC の見本 docs/design/kurabe-pc.png）。長い一覧を読み続けなくてよいように、一度に1つだけ出す。
// スマホ（docs/design/kurabe-mobile.png）はタブを横に流し、選んだ地区と比べる地区の2つを左右に並べる。「4地区を一覧」では項目ごとに4地区を縦に並べる（029）
export function CompareTopicView({ data, topic, selected, hrefFor, onSelect, target, onTargetChange, cityId, onCityChange, conditions, erabuHref }: Props) {
  const districts = data.districtOrder.map((id) => data.districts[id]);
  const activeTab = TAB_ITEMS.find((item) => item.id === topic) ?? TAB_ITEMS[0];
  const next = TAB_ITEMS[(TAB_ITEMS.indexOf(activeTab) + 1) % TAB_ITEMS.length];
  return (
    <div className="flex flex-col gap-3">
      <p className="hidden lg:block">比べたい項目を選んでください。</p>
      {selected !== null && topic !== "city" && <CompareModeSwitch target={target} onChange={onTargetChange} />}
      {/* スマホも横に流さず 3列×2段で全部のタブを見せる（2026-11-15 まさゆきさん s1.png）。PC は1段6列 */}
      <div role="tablist" aria-label="比べたい項目" className="grid grid-cols-3 gap-1.5 lg:grid-cols-6 lg:gap-1">
        {TAB_ITEMS.map((item) => {
          const current = item.id === topic;
          return (
            <button
              key={item.id}
              id={tabId(item.id)}
              type="button"
              role="tab"
              aria-selected={current}
              aria-controls={PANEL_ID}
              onClick={() => onSelect(item.id)}
              className={[
                "flex min-h-tap min-w-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-button border px-0.5 text-[13px] font-bold min-[400px]:gap-1 min-[400px]:text-sm lg:min-h-[3.25rem] lg:gap-2 lg:text-base",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                current ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
              ].join(" ")}
            >
              <KurabeIcon name={item.icon} className="size-4 min-[400px]:size-5 lg:size-6" />
              <span>
                {item.tabLabel}
                {item.tabLabelRest && <span className="hidden lg:inline">{item.tabLabelRest}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {topic === "city" ? (
        <CityCompareView
          data={data}
          district={selected === null ? null : data.districts[selected]}
          cityId={cityId}
          onCityChange={onCityChange}
          conditions={conditions}
          erabuHref={erabuHref}
          panelId={PANEL_ID}
          tabId={tabId("city")}
        />
      ) : (
        <TopicPanel content={activeTab as CompareTopicContent} data={data} districts={districts} selected={selected} target={target} onTargetChange={onTargetChange} />
      )}

      <div className="flex flex-col items-stretch lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:px-6 lg:py-2 lg:shadow-card">
        <p className="hidden lg:block">{activeTab.nextText}</p>
        <ButtonLink href={hrefFor(next.id)} variant="secondary" className="lg:rounded-full">
          {nextButtonLabel(next)}
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </div>
    </div>
  );
}

// 4地区の項目のタブの中身
function TopicPanel({
  content,
  data,
  districts,
  selected,
  target,
  onTargetChange,
}: {
  content: CompareTopicContent;
  data: ScreenData;
  districts: readonly DistrictData[];
  selected: DistrictId | null;
  target: CompareTarget;
  onTargetChange: (target: CompareTarget | null) => void;
}) {
  const selectedDistrict = selected === null ? null : data.districts[selected];
  const targetDistrict = target === "all" ? null : data.districts[target];
  return (
      <section
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={tabId(content.id)}
        className="flex flex-col gap-3 lg:gap-4 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-4 lg:shadow-card"
      >
        {selectedDistrict && targetDistrict && (
          <DistrictPicker selected={selectedDistrict} target={targetDistrict.id} districts={districts} onChange={onTargetChange} />
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 lg:gap-x-3 lg:px-2">
          <KurabeIcon name={content.icon} className="size-7 text-primary lg:size-9" />
          <h2 className="text-xl font-extrabold lg:text-3xl">{content.title}</h2>
          <span aria-hidden="true" className="hidden h-5 border-l border-line min-[360px]:inline lg:h-6" />
          <p className="text-sm text-ink-muted lg:text-base">
            <span className={content.leadMobile ? "hidden lg:inline" : ""}>{content.lead}</span>
            {content.leadMobile && <span className="lg:hidden">{content.leadMobile}</span>}
          </p>
        </div>
        {selectedDistrict && targetDistrict ? (
          <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-1 lg:hidden">
            {content.rows.map((row) => (
              <RowPair key={row.id} row={row} left={selectedDistrict} right={targetDistrict} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-3 lg:hidden">
            {content.rows.map((row) => (
              <RowStack key={row.id} row={row} districts={districts} selected={selected} size="pair" />
            ))}
          </div>
        )}
        <TopicTable content={content} districts={districts} selected={selected} />
        {content.notices.length > 0 && (
          <div className="flex items-center gap-3 rounded-button border border-line bg-surface px-3 py-2 lg:bg-transparent lg:px-4">
            <KurabeIcon name="info" className="size-7 text-primary" />
            <p className="text-sm">
              {content.notices.map((notice, index) => (
                <span key={notice} className={index === 0 ? "block" : "hidden lg:block"}>
                  {notice}
                </span>
              ))}
            </p>
          </div>
        )}
        <TopicSources content={content} data={data} />
      </section>
  );
}

function TopicTable({ content, districts, selected }: { content: CompareTopicContent; districts: readonly DistrictData[]; selected: DistrictId | null }) {
  const tint = (id: DistrictId) => (id === selected ? "bg-primary-soft" : "");
  return (
    <div className="hidden overflow-hidden rounded-button border border-line lg:block">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{content.title}を4地区で並べた表</caption>
        <colgroup>
          <col className="w-[19%]" />
          {districts.map((district) => (
            <col key={district.id} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-kinari-deep">
            <th scope="col" className="px-4 py-3 text-sm">
              項目
            </th>
            {districts.map((district) => (
              <th key={district.id} scope="col" className={`border-l border-line px-2 py-3 text-xl font-extrabold ${tint(district.id)}`}>
                <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  {district.name}
                  {district.id === selected && <SelectedMark />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row) => (
            <tr key={row.id} className="border-t border-line">
              <th scope="row" className="px-4 py-4 align-middle font-bold">
                <RowLabel label={row.label} note={row.note} noteClassName="mt-1 text-sm" />
              </th>
              {districts.map((district) => (
                <td key={district.id} className={`border-l border-line px-3 py-4 align-top xl:px-6 ${tint(district.id)}`}>
                  {row.cell(district, "large")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ふだんは閉じて場所を取らず、必要なときに読む（028 見本）。出すのはこのタブの項目の出典だけ
function TopicSources({ content, data }: { content: CompareTopicContent; data: ScreenData }) {
  const sources = compareSources(data, [content.id]);
  const events = content.id === "events" ? eventSources(data) : [];
  const summary = sourcesSummary([...sources.map(({ source }) => source.publisher), ...events.map((event) => event.note)]);
  return (
    <details className="group rounded-button border border-line bg-surface lg:bg-transparent">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-3 px-3 py-1 lg:px-4 [&::-webkit-details-marker]:hidden">
        <KurabeIcon name="chevron" className="size-5 transition-transform group-open:rotate-180" />
        <span className="flex-1 font-bold">
          {content.sourcesTitle}
          <span className="hidden lg:inline">を見る</span>
        </span>
        {summary && <span className="hidden text-sm text-ink-muted lg:inline">{summary}</span>}
      </summary>
      <div className="flex flex-col gap-3 px-3 pb-4 lg:px-4">
        <TopicSourceList content={content} data={data} />
      </div>
    </details>
  );
}

// このタブの出典・対象時点と、住まいの集計方法（画面の「出典を見る」と印刷。023）
export function TopicSourceList({ content, data }: { content: CompareTopicContent; data: ScreenData }) {
  const sources = compareSources(data, [content.id]);
  const events = content.id === "events" ? eventSources(data) : [];
  return (
    <>
      <DataStateLegend place="その地区" />
      <ul className="flex flex-col divide-y divide-line">
        {sources.map(({ source, period }) => (
          <li key={source.id} className="py-2">
            <DataSourceNote source={source} period={period} />
          </li>
        ))}
        {events.map((event) => (
          <li key={`${event.note}-${event.checkedOn}`} className="py-2">
            <SourceNote source={`地区の行事：${event.note}`} period="確認日の時点の内容" date={event.checkedOn} />
          </li>
        ))}
      </ul>
      {content.id === "housing" && (
        <div className="flex flex-col gap-1 text-sm">
          <h3 className="font-bold">集計方法</h3>
          <p>対象期間の取引を町名で地区に振り分け、中央値を出しています。「調停・競売等」「関係者間取引」「隣地の購入」の取引は除いています。土地の幅は、下位25%〜上位25%の範囲です。</p>
          <Link
            href={`${ABOUT_DATA_PATH}#about-market`}
            className="inline-flex min-h-tap items-center self-start font-bold text-primary underline underline-offset-4 hover:no-underline print:hidden"
          >
            くわしい計算のしかた（データについて）
          </Link>
        </div>
      )}
    </>
  );
}
