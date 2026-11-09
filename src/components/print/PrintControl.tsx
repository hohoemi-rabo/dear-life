"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { fitsOnOnePage, orderSelection, pageContentWidthPx, toggleAll } from "@/lib/print/print";
import { PrintModeProvider } from "./PrintMode";

export type PrintOption<Id extends string> = { id: Id; label: string; icon?: ReactNode };

// 見出しの右上の「印刷する」ボタンと「印刷するものをえらぶ」窓（023・F-07。2026-11-09 まさゆきさん）。
// 選んだものを印刷用の中身（renderDocument）として body の直下に作り、ブラウザの印刷を呼ぶ。
// Safari は、タップから時間をおいて呼んだ印刷を無視する（2026-11-09 本番で、押しても印刷の画面が出なかった）ので、
// 印刷は「印刷する」を押したその場で呼ぶ。絵がそのときまでに届いているよう、印刷用の中身は窓を開いているあいだから作っておく。印刷用の中身は画面には出さず、
// 印刷のときは中身以外を隠す（globals.css の [data-print-document]）。
// 窓を通さずにブラウザのメニューや Ctrl+P で印刷したときは shortcut を出す
export function PrintControl<Id extends string>({
  options,
  initial,
  shortcut,
  renderDocument,
  className = "",
}: {
  options: readonly PrintOption<Id>[];
  // 窓を開いたときにチェックを入れておくもの
  initial: readonly Id[];
  shortcut: readonly Id[];
  renderDocument: (selected: readonly Id[]) => ReactNode;
  className?: string;
}) {
  const ids = options.map((option) => option.id);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<readonly Id[]>(initial);
  const [printing, setPrinting] = useState<readonly Id[] | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  // このボタンから印刷を始めたか。ブラウザのメニューからの印刷と区別する
  const fromButton = useRef(false);
  const shortcutRef = useRef(shortcut);
  shortcutRef.current = shortcut;

  useEffect(() => {
    // 印刷の画面を開く直前に呼ばれる。ここで同期して中身を作れば、その中身が印刷される
    const beforePrint = () => {
      if (fromButton.current) return;
      flushSync(() => setPrinting(orderSelection(ids, shortcutRef.current)));
      keepBlocksThatFit(documentRef.current);
    };
    const afterPrint = () => {
      fromButton.current = false;
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
    // ids は options から毎回作り直すので、中身（文字列）で比べる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const openSheet = () => {
    setSelected(initial);
    setOpen(true);
  };

  const print = () => {
    const chosen = orderSelection(ids, selected);
    if (chosen.length === 0) return;
    // 印刷のあとも中身は消さない（iPhone の Safari は印刷の画面を出す前に afterprint が来ることがあり、消すと白紙になる）
    flushSync(() => {
      setOpen(false);
      setPrinting(chosen);
    });
    keepBlocksThatFit(documentRef.current);
    fromButton.current = true;
    window.print();
  };

  // 窓を開いているあいだは、チェックしているものの中身を作っておき、絵を先に読み込む
  const documentItems = open ? orderSelection(ids, selected) : printing;
  const documentKey = documentItems?.join(",") ?? "";
  useEffect(() => {
    loadImagesNow(documentRef.current);
  }, [documentKey]);

  const allSelected = selected.length === ids.length;
  return (
    <>
      <Button variant="quiet" onClick={openSheet} className={`shrink-0 gap-1.5 px-3 text-sm print:hidden ${className}`}>
        <PixelIcon icon="icon-print" size="sm" />
        印刷する
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="印刷するものをえらぶ">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm">チェックしたものを、A4 縦の紙に印刷します。PDF にするときは、印刷の画面で「PDF に保存」を選んでください。</legend>
          {options.map((option) => (
            <label key={option.id} className="flex min-h-tap cursor-pointer items-center gap-3 rounded-button px-2 hover:bg-kinari">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked ? orderSelection(ids, [...current, option.id]) : current.filter((id) => id !== option.id),
                  )
                }
                className="size-5 shrink-0 accent-primary"
              />
              {option.icon}
              <span className="font-bold">{option.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="quiet" onClick={() => setSelected(toggleAll(ids, selected))}>
            {allSelected ? "すべて外す" : "すべて選ぶ"}
          </Button>
          <Button onClick={print} disabled={selected.length === 0}>
            <PixelIcon icon="icon-print" size="sm" />
            印刷する
          </Button>
        </div>
      </BottomSheet>
      {documentItems !== null &&
        createPortal(
          <PrintModeProvider value>
            <div ref={documentRef} data-print-document="" className="hidden bg-white text-ink print:block">
              {renderDocument(documentItems)}
            </div>
          </PrintModeProvider>,
          document.body,
        )}
    </>
  );
}

// 中で分けてよいまとまり（[data-print-fit]。長い一覧を含むもの）のうち、1ページに収まるものは分けないようにする。
// 印刷用の中身は画面では隠しているので、紙の幅にして見えないところに一度だけ出して高さを測る。
// 1ページより長いものは分ける（分けないようにすると、Chrome は丸ごと次のページへ送ってから分けるので、前のページに見出しだけが残る）
function keepBlocksThatFit(root: HTMLElement | null): void {
  if (!root) return;
  const previous = root.getAttribute("style");
  root.setAttribute("style", `display:block;position:absolute;left:-10000px;top:0;visibility:hidden;width:${pageContentWidthPx()}px`);
  for (const block of Array.from(root.querySelectorAll<HTMLElement>("[data-print-fit]"))) {
    block.style.breakInside = fitsOnOnePage(block.getBoundingClientRect().height) ? "avoid" : "";
  }
  if (previous === null) root.removeAttribute("style");
  else root.setAttribute("style", previous);
}

// 画面に出していない（display: none の）ところでは loading="lazy" の絵は読み込まれないので、すぐ読むように切りかえる
function loadImagesNow(root: HTMLElement | null): void {
  if (!root) return;
  for (const image of Array.from(root.querySelectorAll("img"))) if (image.loading === "lazy") image.loading = "eager";
}
