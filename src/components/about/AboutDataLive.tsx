"use client";

import { DataStateMessage } from "@/components/data/DataStateMessage";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { orderedSources, supportCheckedRange } from "@/lib/about/sources";
import { EVENTS_CREDIT } from "@/lib/credits";
import { formatJaDate, formatQuarterRange } from "@/lib/format";
import { eventSources } from "@/lib/kurabe/compare";

// データについてページ（022）のうち、データベースから読むところ。ページのほかの部分（集計方法・注意書き）は読み込みを待たずに出す

function SmallSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">データを読み込んでいます</span>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

// 相場の対象期間と、集計から外した取引の件数（要件 5章-1・3）
export function MarketCounts() {
  return (
    <ScreenDataBoundary fallback={<SmallSkeleton />}>
      <MarketCountsBody />
    </ScreenDataBoundary>
  );
}

function MarketCountsBody() {
  const state = useScreenData().marketSummary;
  if (state.status !== "available") return <DataStateMessage state={state} />;
  const summary = state.value;
  return (
    <div className="flex flex-col gap-2">
      <p>
        対象期間：<span className="font-bold">{formatQuarterRange(summary.periodFrom, summary.periodTo)}</span>
      </p>
      <p>
        この期間の飯田市の取引 <span className="font-bold tabular-nums">{summary.citywideCount.toLocaleString("ja-JP")}件</span>
        のうち、4地区の取引は <span className="font-bold tabular-nums">{summary.districtCount.toLocaleString("ja-JP")}件</span>
        です。そこから次の <span className="font-bold tabular-nums">{summary.excludedCount}件</span>を除いて計算しています。
      </p>
      <table className="w-full max-w-sm text-sm">
        <caption className="sr-only">集計から除いた取引の件数</caption>
        <tbody className="divide-y divide-line">
          {(
            [
              ["調停・競売等", summary.mediationCount],
              ["関係者間取引", summary.relatedPartyCount],
              ["隣地の購入", summary.adjacentLandCount],
            ] as const
          ).map(([reason, count]) => (
            <tr key={reason}>
              <th scope="row" className="py-1 text-left font-normal">
                {reason}
              </th>
              <td className="py-1 text-right font-bold tabular-nums">{count}件</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-muted">1件の取引が2つの理由に当たることがあるため、理由ごとの件数の合計は除いた件数と合わないことがあります。</p>
    </div>
  );
}

// 出典の一覧。公開済みの出典（data_sources）を、クレジットの文言そのままで出す（要件 7.3）
export function SourceList() {
  return (
    <ScreenDataBoundary fallback={<SmallSkeleton />}>
      <SourceListBody />
    </ScreenDataBoundary>
  );
}

function SourceListBody() {
  const entries = orderedSources(useScreenData().sources);
  if (entries.length === 0) {
    return <p className="text-ink-muted">いま画面に出している出典はありません。出典の確認や取り込みが済んだものから順に出します。</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {entries.map(({ source, use }) => {
        const date = source.checkedOn ?? source.fetchedOn;
        return (
          <li key={source.id} className="rounded-button border border-line p-3">
            <h3 className="font-bold">
              {source.publisher}「{source.name}」
            </h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {use && (
                <>
                  <dt className="text-ink-muted">使い道</dt>
                  <dd>{use}</dd>
                </>
              )}
              <dt className="text-ink-muted">対象</dt>
              <dd>{source.periodLabel ?? "記載なし"}</dd>
              {date && (
                <>
                  <dt className="text-ink-muted">{source.checkedOn ? "確認日" : "取得日"}</dt>
                  <dd>
                    <time dateTime={date}>{formatJaDate(date)}</time>
                  </dd>
                </>
              )}
              {source.license && (
                <>
                  <dt className="text-ink-muted">利用条件</dt>
                  <dd>{source.license}</dd>
                </>
              )}
              {source.credit && (
                <>
                  <dt className="text-ink-muted">クレジット</dt>
                  <dd className="break-all">{source.credit}</dd>
                </>
              )}
            </dl>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-tap items-center text-sm font-bold text-primary underline underline-offset-4"
              >
                配布元のページ
                <span className="sr-only">（{source.name}。新しいタブで開きます）</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// 手でまとめた行事と支援制度。出典の行を持たないので、資料名と確認日を出す（要件 7.1・7.3・10.1）
export function ManualDataList() {
  return (
    <ScreenDataBoundary fallback={<SmallSkeleton />}>
      <ManualDataListBody />
    </ScreenDataBoundary>
  );
}

function ManualDataListBody() {
  const data = useScreenData();
  const events = eventSources(data);
  const support = supportCheckedRange(data);
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="about-events" className="flex flex-col gap-2">
        <h3 id="about-events" className="font-bold">
          地区の行事
        </h3>
        <p>{EVENTS_CREDIT}</p>
        <p className="text-sm text-ink-muted">
          市の公民館活動の資料から、4地区の公民館の行事を季節ごとに1〜2個選び、時期と参加のしかたを地区公民館の情報で確かめています。個人名や個人の連絡先は載せません。
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-ink-muted">いま画面に出している行事はありません。</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {events.map((event) => (
              <li key={`${event.note}-${event.checkedOn}`}>
                資料：{event.note}・確認日 <time dateTime={event.checkedOn}>{formatJaDate(event.checkedOn)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="about-support" className="flex flex-col gap-2">
        <h3 id="about-support" className="font-bold">
          支援制度
        </h3>
        <p>
          飯田市の公式サイトの各ページを読んで、制度名と概要をまとめています。対象になるかどうかは判定しません。制度ごとに公式ページへのリンクを付けています。
        </p>
        {support ? (
          <p className="text-sm">
            {data.supportPrograms.length}件・確認日 <time dateTime={support.from}>{formatJaDate(support.from)}</time>
            {support.to !== support.from && (
              <>
                〜<time dateTime={support.to}>{formatJaDate(support.to)}</time>
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">いま画面に出している支援制度はありません。</p>
        )}
      </section>
    </div>
  );
}
