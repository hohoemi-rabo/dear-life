"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { GofreelyPanel } from "@/components/data/GofreelyPanel";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { DistrictPinIcon } from "@/components/illust/DistrictPinIcon";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { BusOuting } from "@/lib/data/screen-data";
import { houseSrc, propSrc, propSrcSet, type PropId } from "@/lib/illust/assets";
import { SHITAMI_ITEMS, SHITAMI_MEMO_ANCHOR, type ShitamiItem, type ShitamiItemId } from "@/lib/karte/shitami-memo";
import { useShitamiMemo } from "@/lib/karte/useShitamiMemo";
import { busReachDateNote, busReachSentence } from "@/lib/transit/bus-reach";
import type { DistrictId } from "@/lib/town-district/resolve";

type Chosen = Conditions & { district: DistrictId };

// 項目の絵（今ある絵を使う。見本：バス・校舎・古い家）
const ITEM_PICTURES: Readonly<Record<Exclude<ShitamiItemId, "old-house-questions">, PropId>> = {
  "bus-to-town": "detail-bus",
  "walk-around-school": "detail-school",
};

function ItemPicture({ id, className }: { id: ShitamiItemId; className: string }) {
  if (id === "old-house-questions") {
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    return <img src={houseSrc("old", 320)} alt="" loading="lazy" draggable={false} className={className} />;
  }
  const prop = ITEM_PICTURES[id];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img src={propSrc(prop, 240)} srcSet={propSrcSet(prop)} sizes="96px" alt="" loading="lazy" draggable={false} className={className} />
  );
}

function AddedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
      <span aria-hidden="true">✓</span>
      プランに追加済み
    </span>
  );
}

// 「＋ 下見プランに入れる」（036）。カルテ一覧の「わが家の確認ポイント」、カルテの詳細の確認点の近く、くらしのピンの吹き出しに置く。
// 押してもその場で「✓ プランに追加済み」になるだけで、画面は切りかえない。
// 「下見プランを見る」でカルテ一覧の下見プランへ移る（確認ポイントでは、見出しの横の1つにまとめるので出さない）
export function AddToShitamiButton({
  district,
  item,
  memoHref,
  variant = "primary",
  className = "",
}: {
  district: DistrictId;
  item: ShitamiItemId;
  // 「下見プランを見る」の移り先。null なら出さない
  memoHref: string | null;
  // 別のボタンの下に添えるときは控えめにする（カルテ一覧の「わが家の確認ポイント」）
  variant?: "primary" | "quiet";
  className?: string;
}) {
  const memo = useShitamiMemo(district);
  const title = SHITAMI_ITEMS[item].title;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      {memo.has(item) ? (
        <>
          <p role="status" className="flex min-h-tap items-center gap-2 font-bold text-primary">
            <AddedBadge />
            <span className="sr-only">「{title}」を下見プランに入れました。</span>
          </p>
          {memoHref !== null && (
            <Link
              href={memoHref}
              className="inline-flex min-h-tap items-center gap-1 text-sm font-bold text-primary underline underline-offset-4"
            >
              下見プランを見る
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </>
      ) : (
        <Button variant={variant} onClick={() => memo.add(item)} className="w-full sm:w-auto">
          <span aria-hidden="true">＋</span>
          下見プランに入れる
          <span className="sr-only">（{title}）</span>
        </Button>
      )}
    </div>
  );
}

// カルテ一覧の下の「わが家の下見プラン」（036。見本 shitami-memo-*.png。新しいページは作らず一覧の中に置く）。
// 上の「わが家の確認ポイント」が調べる入口、こちらは現地でやることを見返すリスト（2026-11-10 まさゆきさん）。
// 入れた項目だけを出し、閉じたままでも当日にすることの一文を出す。詳しい中身・リンク・「プランから外す」は開いて見る。
// ScreenDataBoundary の中で使う（バスの便を出すため）
export function ShitamiMemoSection({ conditions, links }: { conditions: Chosen; links: ShitamiLinks }) {
  const memo = useShitamiMemo(conditions.district);

  // 「下見プランを見る」（#shitami-memo）で開いたら、データが届いて欄が出てからここまで移る
  useEffect(() => {
    if (window.location.hash.slice(1) === SHITAMI_MEMO_ANCHOR) {
      document.getElementById(SHITAMI_MEMO_ANCHOR)?.scrollIntoView?.({ block: "start" });
    }
  }, []);

  return (
    <section
      id={SHITAMI_MEMO_ANCHOR}
      aria-labelledby="shitami-memo-title"
      className="flex scroll-mt-4 flex-col gap-3 rounded-card border-2 border-primary bg-surface p-4 shadow-card md:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="shitami-memo-title" className="flex items-center gap-2 text-xl font-extrabold md:text-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
          <img
            src={propSrc("shitami-title", 96)}
            srcSet={propSrcSet("shitami-title")}
            sizes="(min-width: 768px) 40px, 32px"
            alt=""
            draggable={false}
            className="size-8 shrink-0 select-none object-contain md:size-10"
          />
          わが家の下見プラン
        </h2>
        <p className="flex items-center gap-1 rounded-full border border-line bg-kinari px-3 py-1 text-xs font-bold md:ml-auto">
          <DistrictPinIcon className="size-4" />
          {DISTRICT_NAMES[conditions.district]}
        </p>
      </div>
      <p className="text-sm">飯田に行った日に、見たい・試したいこと。</p>

      {memo.ids.length === 0 ? (
        <p className="rounded-card bg-kinari p-4 text-sm text-ink-muted">現地で確かめたいことを、上の確認ポイントから追加できます。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {memo.ids.map((id) => (
            <li key={id}>
              <MemoEntry item={SHITAMI_ITEMS[id]}>
                <EntryBody id={id} conditions={conditions} links={links} remove={<RemoveButton item={SHITAMI_ITEMS[id]} onRemove={() => memo.remove(id)} />} />
              </MemoEntry>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-muted">
        {memo.persistent
          ? "下見プランは、この端末のこのブラウザにだけ残ります（地区ごとに分けて残し、サーバーには送りません）。"
          : "この端末では下見プランを残せません。ページを読み直すと消えます。"}
      </p>
    </section>
  );
}

// プランからたどる先。どれも今のカルテ・地図・gofreely へのリンク（新しい地図や経路検索は作らない）
export type ShitamiLinks = { map: string; housing: string };

// 1項目。閉じた形は絵・名前・当日にすることの一文・開く印。開いた形は確認点の箱・リンク・「プランから外す」
function MemoEntry({ item, children }: { item: ShitamiItem; children: ReactNode }) {
  return (
    <details className="group rounded-card border border-line bg-surface open:border-2 open:border-primary">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 p-3 sm:gap-3 [&::-webkit-details-marker]:hidden">
        <ItemPicture id={item.id} className="h-auto w-14 shrink-0 select-none object-contain md:w-24" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold sm:text-base md:text-xl">{item.title}</span>
          <span className="text-sm">{item.summary}</span>
        </span>
        <span aria-hidden="true" className="text-xl text-primary transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-3 pb-4 md:px-4">
        {item.lead && <p className="text-sm">{item.lead}</p>}
        {children}
      </div>
    </details>
  );
}

function RemoveButton({ item, onRemove }: { item: ShitamiItem; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex min-h-tap shrink-0 items-center self-end text-sm font-bold text-primary underline underline-offset-4 sm:self-center"
    >
      プランから外す
      <span className="sr-only">（{item.title}）</span>
    </button>
  );
}

// リンクのボタンと「プランから外す」の行（見本：PC はボタンの右に「プランから外す」、スマホはボタンの下の右）
function Actions({ children, remove }: { children: ReactNode; remove: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row">{children}</div>
      {remove}
    </div>
  );
}

// 見本の黄色い箱：旗の印と見出し、確認点の箇条書き
function CheckBox({ item }: { item: ShitamiItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-card bg-warm-soft p-3 sm:flex-row sm:items-center sm:gap-4 md:p-4">
      <p className="flex shrink-0 items-center gap-2 font-bold sm:border-r sm:border-warm sm:pr-4">
        <PixelIcon icon="icon-sprout" size="sm" />
        {item.checkTitle}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {item.checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
    </div>
  );
}

function EntryBody({ id, conditions, links, remove }: { id: ShitamiItemId; conditions: Chosen; links: ShitamiLinks; remove: ReactNode }) {
  const item = SHITAMI_ITEMS[id];
  switch (id) {
    case "bus-to-town":
      return <BusBody item={item} conditions={conditions} links={links} remove={remove} />;
    case "walk-around-school":
      return (
        <>
          <CheckBox item={item} />
          <Actions remove={remove}>
            <ButtonLink href={links.map} className="sm:flex-1">
              <PixelIcon icon="icon-map" size="sm" />
              学校と学区を地図で見る
            </ButtonLink>
          </Actions>
          {item.note && <p className="text-center text-sm text-ink-muted">{item.note}</p>}
        </>
      );
    case "old-house-questions":
      return (
        <>
          <CheckBox item={item} />
          <Actions remove={remove}>
            <ButtonLink href={links.housing} className="sm:flex-1">
              <PixelIcon icon="icon-document" size="sm" />
              住まいのカルテを見る
            </ButtonLink>
          </Actions>
        </>
      );
  }
}

// バスで街へ行って帰る：バス停の名前と時刻は出さず、地区のバス停のうち乗りかえなしで行けるバス停の数を出す（036。2026-11-11 まさゆきさん）。
// 家の近くのバス停からの便は gofreely の枠で調べてもらう
function BusBody({ item, conditions, links, remove }: { item: ShitamiItem; conditions: Chosen; links: ShitamiLinks; remove: ReactNode }) {
  const outing = useScreenData().districts[conditions.district].busOuting;
  return (
    <>
      {outing.status === "available" ? <BusReach districtName={DISTRICT_NAMES[conditions.district]} outing={outing.value} /> : <DataStateMessage state={outing} />}
      <CheckBox item={item} />
      <GofreelyPanel />
      <Actions remove={remove}>
        <ButtonLink href={links.map} variant="secondary" className="sm:flex-1">
          <PixelIcon icon="icon-map" size="sm" />
          地図でバス停を見る
        </ButtonLink>
      </Actions>
    </>
  );
}

// 「上郷のバス停11か所すべてから、飯田駅へ乗りかえなしで行けるバスがあります。」と、いつの時刻表で数えたか
export function BusReach({ districtName, outing }: { districtName: string; outing: BusOuting }) {
  return (
    <p className="flex flex-col gap-0.5">
      <span className="font-bold">{busReachSentence(districtName, outing)}</span>
      <span className="text-sm text-ink-muted">{busReachDateNote(outing)}</span>
    </p>
  );
}
