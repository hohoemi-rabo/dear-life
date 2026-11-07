import Link from "next/link";
import { IllustPicture } from "@/components/illust/IllustPicture";
import { DISTRICTS } from "@/lib/conditions/labels";
import { DISTRICT_PICTURES } from "@/lib/illust/assets";
import { erabuHrefFor } from "@/lib/top/links";
import { Marker } from "./TopIcon";

// 4地区のカード（033 見本）。押すと、その地区を選んだ状態でえらぶを始める。絵はえらぶ 01 と同じ
export function TopDistricts() {
  return (
    <section aria-labelledby="top-districts" className="flex flex-col gap-3">
      <h2 id="top-districts" className="flex flex-wrap items-baseline gap-x-4 text-xl font-extrabold md:text-2xl">
        <Marker>どのまちで、暮らしてみる？</Marker>
        <span className="border-l border-line pl-4 text-sm font-bold text-ink-muted">対象の4地区</span>
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {DISTRICTS.map(({ id, name }) => (
          <li key={id}>
            <Link
              href={erabuHrefFor(id)}
              className="group block overflow-hidden rounded-card border border-line bg-surface shadow-card transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="block overflow-hidden">
                <IllustPicture
                  picture={DISTRICT_PICTURES[id]}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  decorative
                  className="block aspect-[2/1] w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                />
              </span>
              <span className="flex min-h-tap items-center justify-between px-4 py-2 text-lg font-extrabold">
                {name}
                <span aria-hidden="true" className="text-primary">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
