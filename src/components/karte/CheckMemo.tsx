import Link from "next/link";
import { PixelIcon, type IconId } from "@/components/pixel/PixelIcon";
import { buttonClassName } from "@/components/ui/Button";
import { HOUSING_LABELS } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { houseSrc, propSrc, propSrcSet } from "@/lib/illust/assets";
import type { CheckMemoItem } from "@/lib/karte/check-memo";
import { shitamiItemForCard } from "@/lib/karte/shitami-memo";
import { useShitamiMemo } from "@/lib/karte/useShitamiMemo";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CARD_PICTURES } from "./KarteEntries";
import { AddToShitamiButton } from "./ShitamiMemo";

// 「わが家の確認ポイント」（2026-11-07 まさゆきさんの提案と見本の並び。028。はじめの名前は「わが家の確認メモ」）。見出しと分野のタブのあいだに置く。
// 気になることを調べる入口。下の「わが家の下見プラン」（現地でやることを見返すリスト）と使い分ける（2026-11-10 まさゆきさん。036）。
// 問いごとに「＋ 下見プランに入れる」を添え、「下見プランを見る（N件）↓」は見出しの横に1つだけ置く。
// 問いは PC・iPad では横に並べ、スマホは縦に積む。右上の札で、どの条件から問いが生まれたかを見せる
export function CheckMemo({
  conditions,
  items,
  hrefFor,
  shitamiMemoHref,
}: {
  conditions: Conditions & { district: DistrictId };
  items: readonly CheckMemoItem[];
  hrefFor: (item: CheckMemoItem) => string;
  // 「下見プランを見る」の移り先（同じページの #shitami-memo）
  shitamiMemoHref: string;
}) {
  const plan = useShitamiMemo(conditions.district);
  const chips: { icon: IconId; text: string }[] = [
    ...(conditions.children > 0 ? [{ icon: "icon-family" as const, text: `子ども${conditions.children}人` }] : []),
    ...(conditions.car === 0 ? [{ icon: "icon-car" as const, text: "車0台" }] : []),
    { icon: "icon-house", text: HOUSING_LABELS[conditions.housing] },
  ];
  const columns = items.length >= 3 ? "lg:grid-cols-3" : items.length === 2 ? "md:grid-cols-2" : "";
  // 問いを縦に積む幅（iPad の縦で3つ、どの幅でも1つ）では、ボタンを幅いっぱいに伸ばさず右に寄せる
  const button =
    items.length >= 3 ? "w-full md:w-auto md:self-end lg:w-full lg:self-auto" : items.length === 2 ? "w-full" : "w-full md:w-auto md:self-end";

  return (
    <section aria-labelledby="check-memo-title" className="flex flex-col gap-3 rounded-card border-2 border-warm bg-surface p-4 shadow-card md:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="check-memo-title" className="flex items-center gap-2 text-xl font-extrabold md:text-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
          <img
            src={propSrc("karte-check-memo", 96)}
            srcSet={propSrcSet("karte-check-memo")}
            sizes="(min-width: 768px) 40px, 32px"
            alt=""
            draggable={false}
            className="size-8 shrink-0 select-none object-contain md:size-10"
          />
          わが家の確認ポイント
        </h2>
        <p className="text-sm text-ink-muted">選んだ暮らしの条件に合わせて、気になることを調べよう。</p>
        <ul aria-label="もとにした条件" className="flex flex-wrap gap-2 md:ml-auto">
          {chips.map((chip) => (
            <li key={chip.text} className="flex items-center gap-1 rounded-full border border-line bg-kinari px-3 py-1 text-xs font-bold">
              <PixelIcon icon={chip.icon} size="sm" />
              {chip.text}
            </li>
          ))}
        </ul>
        {/* 問いごとに出していた「下見メモを見る」を1つにまとめた。件数は表示中の地区のプランの数 */}
        <Link
          href={shitamiMemoHref}
          className="inline-flex min-h-tap items-center gap-1 text-sm font-bold text-primary underline underline-offset-4"
        >
          下見プランを見る{plan.ids.length > 0 && `（${plan.ids.length}件）`}
          <span aria-hidden="true">↓</span>
        </Link>
      </div>
      <ul className={`grid gap-3 ${columns}`}>
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 rounded-card bg-warm-soft p-3 md:p-4">
            <span className="self-start rounded-full bg-surface px-3 py-0.5 text-xs font-bold text-ink">{item.tag}</span>
            <div className="flex flex-1 items-start gap-3">
              <MemoPicture item={item} conditions={conditions} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-base font-bold md:text-lg">{item.question}</p>
                <p className="text-sm text-ink-muted">{item.note}</p>
              </div>
            </div>
            <Link href={hrefFor(item)} className={buttonClassName("secondary", `${button} text-sm`)}>
              {item.action}
              <span aria-hidden="true">→</span>
            </Link>
            <ShitamiFollowUp item={item} conditions={conditions} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// 問いの左の絵。カルテのカードと同じ絵（住まいは選んだ家の絵）。飾りなので読み上げない
function MemoPicture({ item, conditions }: { item: CheckMemoItem; conditions: Conditions }) {
  const className = "h-auto w-20 shrink-0 select-none object-contain md:w-24";
  if (item.card === "housing") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
      <img src={houseSrc(conditions.housing, 320)} alt="" loading="lazy" draggable={false} className={className} />
    );
  }
  const prop = CARD_PICTURES[item.card];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img src={propSrc(prop, 240)} srcSet={propSrcSet(prop)} sizes="96px" alt="" loading="lazy" draggable={false} className={className} />
  );
}

// 問いに合う下見プランの項目があれば「＋ 下見プランに入れる」を添える（子ども→学校のまわりを歩く、車0台→バスで街へ行って帰る、
// 買う・古め→古めの家で聞くこと）。新しめの家・借りるには項目がないので出さない
function ShitamiFollowUp({ item, conditions }: { item: CheckMemoItem; conditions: Conditions & { district: DistrictId } }) {
  const shitami = shitamiItemForCard(item.card, conditions);
  if (shitami === null) return null;
  return (
    <AddToShitamiButton
      district={conditions.district}
      item={shitami}
      memoHref={null}
      variant="quiet"
      className="justify-center text-sm [&>button]:w-full [&>button]:text-sm"
    />
  );
}
