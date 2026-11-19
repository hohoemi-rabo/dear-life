"use client";

import { useEffect, useSyncExternalStore, type ComponentType } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PrintControl, type PrintOption } from "@/components/print/PrintControl";
import { karteLayout } from "@/lib/conditions/karte-order";
import { KARTE_CARD_LABELS, type KarteCard } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { useShitamiMemo } from "@/lib/karte/useShitamiMemo";
import type { DistrictId } from "@/lib/town-district/resolve";
import { KarteCardIcon } from "./KarteCardIcon";

type Chosen = Conditions & { district: DistrictId };
export type KartePrintChosen = Chosen;

// 印刷で選べるもの：カルテのまとめ（一覧）と7項目（023。2026-11-09 まさゆきさん：項目ごとに選ぶ）と、
// わが家の下見プラン（036。紙でも持っていけるように。メモが空のときは選べるものに出さない）
export type KartePrintItem = "summary" | KarteCard | "shitami";

// 印刷用の中身（KartePrintDocument.tsx）は7項目の詳細のパネルを全部読むので、画面の最初の読み込みには入れず、あとから読む（044）。
// Safari はタップから時間をおいた印刷を無視する（PrintControl）ので、押してから読むのではなく、画面が落ち着いたら先に読んでおく。
// 届くまでは窓の「印刷する」を押せなくする。届く前にブラウザのメニューから印刷すると、画面そのままが印刷される（044 で受け入れた）
type DocumentComponent = ComponentType<{ conditions: Chosen; items: readonly KartePrintItem[] }>;
let documentComponent: DocumentComponent | null = null;
let documentLoading: Promise<void> | null = null;
const documentListeners = new Set<() => void>();

export function loadKartePrintDocument(): Promise<void> {
  documentLoading ??= import("./KartePrintDocument").then(
    (loaded) => {
      documentComponent = loaded.KartePrintDocument;
      for (const listener of documentListeners) listener();
    },
    (error: unknown) => {
      // 通信できなかったときは、次に窓を開いたときにもう一度読む
      documentLoading = null;
      console.error("印刷用の中身を読み込めませんでした", error);
    },
  );
  return documentLoading;
}

function subscribeDocument(onChange: () => void): () => void {
  documentListeners.add(onChange);
  return () => documentListeners.delete(onChange);
}

function useKartePrintDocument(): DocumentComponent | null {
  const component = useSyncExternalStore(
    subscribeDocument,
    () => documentComponent,
    () => null,
  );
  useEffect(() => {
    if (documentComponent !== null) return;
    // 画面の中身の読み込みと描画をじゃましないよう、手があいたときに読む（Safari には requestIdleCallback がない）
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => void loadKartePrintDocument());
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(() => void loadKartePrintDocument(), 1);
    return () => clearTimeout(timer);
  }, []);
  return component;
}

// カルテ一覧と詳細の見出しの右上に置く「印刷する」。一覧から開くとすべてに、詳細から開くとその項目だけにチェックを入れる。
// ブラウザのメニューから印刷したときは、開いているページの分（一覧ならまとめ、詳細ならその項目）を出す
export function KartePrintButton({ conditions, current }: { conditions: Chosen; current: KarteCard | null }) {
  const { cards } = karteLayout(conditions);
  const shitami = useShitamiMemo(conditions.district);
  const PrintDocument = useKartePrintDocument();
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
      documentReady={PrintDocument !== null}
      onOpen={() => void loadKartePrintDocument()}
      renderDocument={(selected) => (PrintDocument === null ? null : <PrintDocument conditions={conditions} items={selected} />)}
    />
  );
}
