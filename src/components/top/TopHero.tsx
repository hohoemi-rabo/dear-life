import { IllustPicture } from "@/components/illust/IllustPicture";
import { PixelImage } from "@/components/pixel/PixelImage";
import { ResumeLastView } from "@/components/pwa/ResumeLastView";
import { ButtonLink } from "@/components/ui/Button";
import { ERABU_PATH } from "@/lib/site";
import { Marker, TopIcon } from "./TopIcon";

// トップのいちばん上（033 見本）：左に見出しと「わが家の暮らしをつくる」、右に大きな絵。左右の端に草と花の飾り
export function TopHero() {
  return (
    // 見本：大きな絵の右に草と花の飾りが絵と重ならずに並ぶので、右に飾りの幅だけ空ける。
    // 左の列は見出しの2行目（飯田で暮らしたら。）が収まる幅にし、残りを絵にする
    <section className="relative grid items-center gap-6 lg:grid-cols-[30rem_minmax(0,1fr)] lg:gap-8 lg:pr-16">
      <div className="flex flex-col gap-5 lg:pl-10">
        {/* 見本：「ゲーム感覚で…」は見出しの1行目（もしも、わが家が）の上の真ん中。
            2行目は「。」と黄色い線のぶん長いので、幅に数えない（数えると真ん中が右にずれる） */}
        <div className="flex w-fit flex-col gap-5">
          <p className="self-center text-sm font-extrabold text-primary md:text-base">
            <span aria-hidden="true">＼ </span>ゲーム感覚で、飯田の暮らしを体験<span aria-hidden="true"> ／</span>
          </p>
          <h1 className="text-4xl font-extrabold leading-snug md:text-5xl md:leading-snug">
            もしも、わが家が
            <span className="block w-0 whitespace-nowrap">
              <Marker>飯田で暮らしたら。</Marker>
            </span>
          </h1>
        </div>
        <p className="leading-relaxed md:text-lg">
          家族・地区・家・車をえらんで、
          <br />
          春夏秋冬の暮らしをのぞいてみよう。
        </p>
        <div className="flex flex-col items-center gap-2 self-start">
          <ButtonLink href={ERABU_PATH} className="px-8 py-4 text-xl shadow-card md:text-2xl">
            わが家の暮らしをつくる
            <span aria-hidden="true">→</span>
          </ButtonLink>
          <p className="text-sm text-ink-muted">登録不要</p>
          <ResumeLastView />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-card border-[3px] border-primary shadow-card">
        <IllustPicture picture="top-hero" sizes="(min-width: 1024px) 58vw, 100vw" priority className="block h-auto w-full" />
        <p className="absolute left-3 top-3 flex items-center gap-2 rounded-button border-2 border-ink bg-surface px-3 py-1.5 text-sm font-extrabold md:text-base">
          <PixelImage asset="logo" scale={1} decorative />
          わが家の、これからの暮らし
        </p>
        {/* 押せない札（季節のタブではない。絵は季節で替えない。2026-11-07 まさゆきさん） */}
        <p className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-sm font-bold text-ink-muted">
          春夏秋冬を のぞける
        </p>
        <p className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full border border-line bg-surface/95 px-4 py-1 text-xs md:text-sm">
          風景は、地区の特徴をもとにしたイメージです。
        </p>
      </div>

      <TopIcon icon="grass-left" sizes="96px" className="absolute -bottom-10 -left-2 hidden w-24 lg:block" />
      <TopIcon icon="grass-right" sizes="64px" className="absolute -bottom-6 right-0 hidden w-16 lg:block" />
    </section>
  );
}
