import { Fragment } from "react";
import type { TopIconId } from "@/lib/illust/assets";
import { Marker, TopIcon } from "./TopIcon";

// 01 えらぶ → 02 くらし → 03 カルテ の流れ（033 見本）。説明なので押せない（押すのは上のボタンと地区のカード）
const STEPS: readonly { icon: TopIconId; title: string; body: string }[] = [
  { icon: "erabu", title: "暮らしをえらぶ", body: "地区・家族・家・車を設定" },
  { icon: "kurashi", title: "四季をのぞく", body: "春夏秋冬の暮らしを体験" },
  { icon: "karte", title: "カルテで確かめる", body: "気になる情報を出典つきで確認" },
];

export function TopSteps() {
  return (
    <section aria-labelledby="top-steps" className="flex flex-col gap-3">
      <h2 id="top-steps" className="text-xl font-extrabold md:text-2xl">
        <Marker>えらぶだけで、暮らしが見えてくる。</Marker>
      </h2>
      <ol className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        {STEPS.map((step, index) => (
          <Fragment key={step.icon}>
            {index > 0 && (
              <li aria-hidden="true" className="self-center text-2xl font-bold text-primary max-lg:rotate-90">
                →
              </li>
            )}
            <li className="flex flex-1 items-center gap-4 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
              <TopIcon icon={step.icon} sizes="96px" className="h-16 w-20" />
              <div>
                <p className="flex items-center gap-2 text-lg font-extrabold">
                  <span className="rounded bg-marker px-1.5 text-sm">{String(index + 1).padStart(2, "0")}</span>
                  {step.title}
                </p>
                <p className="text-sm text-ink-muted">{step.body}</p>
              </div>
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
