import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KarteDetailView } from "@/components/karte/KarteDetailView";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { KARTE_CARD_LABELS } from "@/lib/conditions/labels";
import { KARTE_DETAIL_SLUGS, karteCardFromSlug } from "@/lib/karte/entries";

type Params = Promise<{ item: string }>;

// 静的書き出しなので、7項目の詳細のページをビルド時にすべて作る。ほかの名前は 404
export const dynamicParams = false;

export function generateStaticParams(): { item: string }[] {
  return Object.values(KARTE_DETAIL_SLUGS).map((item) => ({ item }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const card = karteCardFromSlug((await params).item);
  return { title: card ? `${KARTE_CARD_LABELS[card]}｜カルテ` : "カルテ" };
}

// カルテの詳細（図鑑の1ページ。028）。条件は URL パラメータで持つので、読むのはブラウザで動き出してから
export default async function KarteDetailPage({ params }: { params: Params }) {
  const card = karteCardFromSlug((await params).item);
  if (!card) notFound();
  return (
    <Suspense fallback={<ScreenSkeleton label="カルテを読み込んでいます" />}>
      <KarteDetailView card={card} />
    </Suspense>
  );
}
