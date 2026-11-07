import Link from "next/link";
import { ABOUT_DATA_PATH } from "@/lib/site";
import type { TopIconId } from "@/lib/illust/assets";
import { TopIcon } from "./TopIcon";

// 「絵はイメージ、数字は本物」を最初に伝える帯（033 見本・要件 1章）。
// スマホの見本（top-mobile.png）は縦に2つ並べ、文を短くし、「データと表現について」を2つ目の文の下に置く
const NOTES: readonly { icon: TopIconId; title: string; body: string; shortBody: string }[] = [
  {
    icon: "scenery",
    title: "風景は、イメージ。",
    body: "ドット絵は地区の特徴をもとにした表現です。実際の景観・建物の配置・距離とは異なります。",
    shortBody: "地区の特徴をもとにしたドット絵です。実際の景観・建物の配置・距離とは異なります。",
  },
  {
    icon: "data",
    title: "暮らしの情報は、公開データから。",
    body: "人口や住まいの数字、学校・交通などの施設情報は、公開資料をもとに掲載。出典と基準日も確認できます。",
    shortBody: "数字や施設情報は公開資料をもとに掲載。出典と基準日も確認できます。",
  },
];

function AboutDataLink({ className }: { className: string }) {
  return (
    <Link href={ABOUT_DATA_PATH} className={`min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4 ${className}`}>
      データと表現について
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function TopNotes() {
  return (
    <section aria-label="風景とデータについて" className="flex flex-col rounded-card bg-primary-soft px-3 py-1 sm:px-4 sm:py-2 lg:flex-row lg:items-center lg:px-8 lg:py-4">
      {NOTES.map((note, index) => (
        <div
          key={note.icon}
          className="flex flex-1 items-center gap-3 border-line sm:gap-4 py-3 max-lg:[&:not(:last-child)]:border-b lg:border-r lg:py-0 lg:pr-6 [&:nth-child(2)]:lg:pl-6"
        >
          <TopIcon icon={note.icon} sizes="96px" className="h-14 w-16 sm:h-16 sm:w-20 md:h-20 md:w-24" />
          <div className="flex flex-col">
            <h2 className="text-[0.9375rem] font-extrabold text-primary sm:text-lg md:text-xl">{note.title}</h2>
            <p className="text-[0.8125rem] leading-relaxed sm:text-sm lg:hidden">{note.shortBody}</p>
            <p className="hidden text-sm leading-relaxed lg:block">{note.body}</p>
            {index === NOTES.length - 1 && <AboutDataLink className="inline-flex self-start lg:hidden" />}
          </div>
        </div>
      ))}
      <AboutDataLink className="hidden self-center pl-6 lg:inline-flex" />
    </section>
  );
}
