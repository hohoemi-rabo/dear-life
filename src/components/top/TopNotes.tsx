import Link from "next/link";
import { ABOUT_DATA_PATH } from "@/lib/site";
import type { TopIconId } from "@/lib/illust/assets";
import { TopIcon } from "./TopIcon";

// 「絵はイメージ、数字は本物」を最初に伝える帯（033 見本・要件 1章）
const NOTES: readonly { icon: TopIconId; title: string; body: string }[] = [
  {
    icon: "scenery",
    title: "風景は、イメージ。",
    body: "ドット絵は地区の特徴をもとにした表現です。実際の景観・建物の配置・距離とは異なります。",
  },
  {
    icon: "data",
    title: "暮らしの情報は、公開データから。",
    body: "人口や住まいの数字、学校・交通などの施設情報は、公開資料をもとに掲載。出典と基準日も確認できます。",
  },
];

export function TopNotes() {
  return (
    <section aria-label="風景とデータについて" className="flex flex-col gap-4 rounded-card bg-primary-soft px-5 py-4 lg:flex-row lg:items-center lg:gap-0 lg:px-8">
      {NOTES.map((note) => (
        <div key={note.icon} className="flex flex-1 items-center gap-4 lg:border-r lg:border-line lg:pr-6 [&:nth-child(2)]:lg:pl-6">
          <TopIcon icon={note.icon} sizes="96px" className="h-16 w-20 md:h-20 md:w-24" />
          <div>
            <h2 className="text-lg font-extrabold text-primary md:text-xl">{note.title}</h2>
            <p className="text-sm leading-relaxed">{note.body}</p>
          </div>
        </div>
      ))}
      <Link
        href={ABOUT_DATA_PATH}
        className="inline-flex min-h-tap items-center gap-1 self-end font-bold text-primary underline underline-offset-4 lg:self-center lg:pl-6"
      >
        データと表現について
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
