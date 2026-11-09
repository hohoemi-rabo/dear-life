"use client";

import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { PrintControl, type PrintOption } from "@/components/print/PrintControl";
import { PrintBlock, PrintHeader, PrintSection } from "@/components/print/PrintParts";
import type { Conditions } from "@/lib/conditions/model";
import type { CompareTopic } from "@/lib/kurabe/compare";
import { RowLabel, SelectedMark } from "./CompareLayouts";
import { TopicSourceList } from "./CompareTopicView";
import { KurabeIcon } from "./KurabeIcon";
import { COMPARE_TOPIC_CONTENTS, type CompareTopicContent } from "./rows";

// 地区くらべの「印刷する」（023）。5項目をチェックで選び、最初はすべてにチェックを入れて開く。
// 選び方をカルテとそろえたのは、印刷の操作を同じにし、紙の枚数を使う人が決められるようにするため（2026-11-09。まさゆきさんが実装を見て決める）。
// スマホで2地区ずつ見ていても、紙にはどの項目も4地区を横に並べる
export function KurabePrintButton({ conditions }: { conditions: Conditions }) {
  const options: PrintOption<CompareTopic>[] = COMPARE_TOPIC_CONTENTS.map((content) => ({
    id: content.id,
    label: `${content.tabLabel}${content.tabLabelRest ?? ""}`,
    icon: <KurabeIcon name={content.icon} className="size-5 text-primary" />,
  }));
  const all = options.map((option) => option.id);
  return (
    <PrintControl
      options={options}
      initial={all}
      shortcut={all}
      renderDocument={(selected) => <KurabePrintDocument conditions={conditions} topics={selected} />}
    />
  );
}

function KurabePrintDocument({ conditions, topics }: { conditions: Conditions; topics: readonly CompareTopic[] }) {
  return (
    <ScreenDataBoundary fallback={null}>
      <PrintHeader title="4地区をくらべる" conditions={conditions} />
      <PrintSection first label="地区くらべ">
        <p className="text-sm">同じ項目を横に並べています。地区の並びは固定です。優劣・おすすめ順ではありません。</p>
        {COMPARE_TOPIC_CONTENTS.filter((content) => topics.includes(content.id)).map((content) => (
          <TopicPrint key={content.id} content={content} conditions={conditions} />
        ))}
      </PrintSection>
    </ScreenDataBoundary>
  );
}

// 1項目：見出し・4地区の表・注意書き・出典。表は途中で切らない。項目ごとに紙を替えず、続けて並べる（紙を減らすため）
function TopicPrint({ content, conditions }: { content: CompareTopicContent; conditions: Conditions }) {
  const data = useScreenData();
  const districts = data.districtOrder.map((id) => data.districts[id]);
  const selected = conditions.district;
  const tint = (id: string) => (id === selected ? "bg-primary-soft" : "");
  return (
    <section aria-label={content.title} className="space-y-2">
      <div className="flex break-after-avoid items-center gap-2">
        <KurabeIcon name={content.icon} className="size-6 text-primary" />
        <h2 className="text-xl font-extrabold">{content.title}</h2>
        <p className="text-sm text-ink-muted">{content.lead}</p>
      </div>
      <table className="w-full table-fixed break-inside-avoid border-collapse border border-line text-left text-sm">
        <caption className="sr-only">{content.title}を4地区で並べた表</caption>
        <colgroup>
          <col className="w-[20%]" />
          {districts.map((district) => (
            <col key={district.id} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-kinari-deep">
            <th scope="col" className="px-2 py-2 text-xs">
              項目
            </th>
            {districts.map((district) => (
              <th key={district.id} scope="col" className={`border-l border-line px-2 py-2 font-extrabold ${tint(district.id)}`}>
                <span className="flex flex-wrap items-center gap-1">
                  {district.name}
                  {district.id === selected && <SelectedMark />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row) => (
            <tr key={row.id} className="break-inside-avoid border-t border-line">
              <th scope="row" className="px-2 py-2 align-top font-bold">
                <RowLabel label={row.label} note={row.note} />
              </th>
              {districts.map((district) => (
                <td key={district.id} className={`border-l border-line px-2 py-2 align-top ${tint(district.id)}`}>
                  {row.cell(district, "compact")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {content.notices.map((notice) => (
        <p key={notice} className="text-xs">
          ※{notice}
        </p>
      ))}
      <PrintBlock breakable className="space-y-2 text-sm">
        <h3 className="font-bold">{content.sourcesTitle}</h3>
        <TopicSourceList content={content} data={data} />
      </PrintBlock>
    </section>
  );
}
