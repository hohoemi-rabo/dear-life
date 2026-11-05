import Link from "next/link";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateLegend } from "@/components/data/DataStateMessage";
import { ButtonLink } from "@/components/ui/Button";
import { SourceNote } from "@/components/ui/SourceNote";
import type { DistrictData, ScreenData } from "@/lib/data/screen-data";
import { compareSources, COMPARE_TOPICS, eventSources, sourcesSummary, type CompareTopic } from "@/lib/kurabe/compare";
import type { CompareView } from "@/lib/kurabe/links";
import { ABOUT_DATA_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { RowLabel, SelectedMark } from "./CompareLayouts";
import { KurabeIcon } from "./KurabeIcon";
import { COMPARE_TOPIC_CONTENTS, type CompareTopicContent } from "./rows";

type Props = {
  data: ScreenData;
  topic: CompareTopic;
  selected: DistrictId | null;
  hrefFor: (view: CompareView) => string;
  onSelect: (topic: CompareTopic) => void;
};

const PANEL_ID = "kurabe-topic-panel";
const tabId = (topic: CompareTopic) => `kurabe-tab-${topic}`;

// PC（lg 以上）：比べたい項目をタブで切りかえる（028 見本 docs/design/kurabe-pc.png）。長い一覧を読み続けなくてよいように、一度に1つだけ出す
export function CompareTopicView({ data, topic, selected, hrefFor, onSelect }: Props) {
  const districts = data.districtOrder.map((id) => data.districts[id]);
  const content = COMPARE_TOPIC_CONTENTS.find((item) => item.id === topic) ?? COMPARE_TOPIC_CONTENTS[0];
  const next = COMPARE_TOPIC_CONTENTS[(COMPARE_TOPICS.indexOf(topic) + 1) % COMPARE_TOPICS.length];
  return (
    <div className="hidden flex-col gap-3 lg:flex">
      <p>比べたい項目を選んでください。</p>
      <div role="tablist" aria-label="比べたい項目" className="grid grid-cols-5 gap-1">
        {COMPARE_TOPIC_CONTENTS.map((item) => {
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
                "flex min-h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-button border px-1 font-bold",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                current ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
              ].join(" ")}
            >
              <KurabeIcon name={item.icon} />
              {item.tabLabel}
            </button>
          );
        })}
      </div>

      <section
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={tabId(content.id)}
        className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card"
      >
        <div className="flex items-center gap-3 px-2">
          <KurabeIcon name={content.icon} className="size-9 text-primary" />
          <h2 className="text-3xl font-extrabold">{content.title}</h2>
          <span aria-hidden="true" className="h-6 border-l border-line" />
          <p className="text-ink-muted">{content.lead}</p>
        </div>
        <TopicTable content={content} districts={districts} selected={selected} />
        {content.notices.length > 0 && (
          <div className="flex items-center gap-3 rounded-button border border-line px-4 py-2">
            <KurabeIcon name="info" className="size-7 text-primary" />
            <p className="text-sm">
              {content.notices.map((notice) => (
                <span key={notice} className="block">
                  {notice}
                </span>
              ))}
            </p>
          </div>
        )}
        <TopicSources content={content} data={data} />
      </section>

      <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-surface px-6 py-2 shadow-card">
        <p>{content.nextText}</p>
        <ButtonLink href={hrefFor(next.id)} variant="secondary" className="rounded-full">
          {next.tabLabel}を比べる
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </div>
    </div>
  );
}

function TopicTable({ content, districts, selected }: { content: CompareTopicContent; districts: readonly DistrictData[]; selected: DistrictId | null }) {
  const tint = (id: DistrictId) => (id === selected ? "bg-primary-soft" : "");
  return (
    <div className="overflow-hidden rounded-button border border-line">
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
    <details className="group rounded-button border border-line">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-3 px-4 py-1 [&::-webkit-details-marker]:hidden">
        <KurabeIcon name="chevron" className="size-5 transition-transform group-open:rotate-180" />
        <span className="flex-1 font-bold">{content.sourcesTitle}</span>
        {summary && <span className="text-sm text-ink-muted">{summary}</span>}
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
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
            <p>対象期間の取引を町名で地区に振り分け、真ん中の値を出しています。「調停・競売等」「関係者間取引」「隣地の購入」の取引は除いています。土地の幅は、下位25%〜上位25%の範囲です。</p>
            <Link href={`${ABOUT_DATA_PATH}#about-market`} className="inline-flex min-h-tap items-center self-start font-bold text-primary underline underline-offset-4 hover:no-underline">
              くわしい計算のしかた（データについて）
            </Link>
          </div>
        )}
      </div>
    </details>
  );
}
