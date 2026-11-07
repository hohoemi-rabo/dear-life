import { IllustPicture } from "@/components/illust/IllustPicture";
import { PixelImage } from "@/components/pixel/PixelImage";
import { ResumeLastView } from "@/components/pwa/ResumeLastView";
import { ButtonLink } from "@/components/ui/Button";
import { ERABU_PATH } from "@/lib/site";
import { Marker, TopIcon } from "./TopIcon";

const CAPTION = "風景は、地区の特徴をもとにしたイメージです。";

// トップのいちばん上（033 見本）。
// PC（top-pc.png）：左に見出しと「わが家の暮らしをつくる」、右に大きな絵。左右の端に草と花の飾り。
// スマホ（top-mobile.png）：見出し → 絵（断り書きは絵の下）→ ボタンの順に真ん中ぞろえで並べ、草と花は「つづきから」の左右に置く
export function TopHero() {
  return (
    // PC：大きな絵の右に草と花の飾りが絵と重ならずに並ぶので、右に飾りの幅だけ空ける。
    // 左の列は見出しの2行目（飯田で暮らしたら。）が収まる幅にし、残りを絵にする
    <section className="relative grid gap-5 lg:grid-cols-[30rem_minmax(0,1fr)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-8 lg:gap-y-5 lg:pr-16">
      <div className="flex flex-col items-center gap-4 text-center lg:col-start-1 lg:row-start-2 lg:items-start lg:gap-5 lg:pl-10 lg:text-left">
        {/* PC：「ゲーム感覚で…」は見出しの1行目（もしも、わが家が）の上の真ん中。
            2行目は「。」と黄色い線のぶん長いので、幅に数えない（数えると真ん中が右にずれる）。スマホは全部真ん中ぞろえ */}
        <div className="flex w-fit flex-col gap-3 lg:gap-5">
          <p className="self-center text-sm font-extrabold text-primary md:text-base">
            <span aria-hidden="true">＼ </span>ゲーム感覚で、飯田の暮らしを体験<span aria-hidden="true"> ／</span>
          </p>
          <h1 className="text-[2rem] font-extrabold leading-snug sm:text-4xl md:text-5xl md:leading-snug">
            もしも、わが家が
            <span className="block lg:w-0 lg:whitespace-nowrap">
              <Marker>飯田で暮らしたら。</Marker>
            </span>
          </h1>
        </div>
        <p className="leading-relaxed md:text-lg">
          家族・地区・家・車をえらんで、
          <br />
          春夏秋冬の暮らしをのぞいてみよう。
        </p>
      </div>

      <figure className="flex flex-col gap-2 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
        <div className="relative overflow-hidden rounded-card border-[3px] border-primary shadow-card">
          <IllustPicture picture="top-hero" sizes="(min-width: 1024px) 58vw, 100vw" priority className="block h-auto w-full" />
          <p className="absolute left-2 top-2 flex items-center gap-2 rounded-button border-2 border-ink bg-surface px-2.5 py-1 text-xs font-extrabold sm:text-sm lg:left-3 lg:top-3 lg:px-3 lg:py-1.5 lg:text-base">
            <PixelImage asset="logo" scale={1} decorative />
            わが家の、これからの暮らし
          </p>
          {/* 押せない札（季節のタブではない。絵は季節で替えない。2026-11-07 まさゆきさん）。スマホの見本にはない */}
          <p className="absolute right-3 top-3 hidden rounded-full bg-surface/90 px-3 py-1 text-sm font-bold text-ink-muted lg:block">
            春夏秋冬を のぞける
          </p>
          <p className="absolute inset-x-0 bottom-3 mx-auto hidden w-fit rounded-full border border-line bg-surface/95 px-4 py-1 text-sm lg:block">
            {CAPTION}
          </p>
        </div>
        <figcaption className="text-center text-xs text-ink-muted lg:hidden">{CAPTION}</figcaption>
      </figure>

      <div className="flex flex-col items-center gap-2 lg:col-start-1 lg:row-start-3 lg:self-start lg:pl-10">
        <div className="flex w-full flex-col items-center gap-2 lg:w-auto">
          <ButtonLink href={ERABU_PATH} className="w-full max-w-md px-8 py-4 text-xl shadow-card md:text-2xl lg:w-auto">
            わが家の暮らしをつくる
            <span aria-hidden="true">→</span>
          </ButtonLink>
          <p className="text-sm text-ink-muted">登録不要</p>
          {/* スマホ：草と花は「つづきから」の左右（つづきがない人にも飾りは出す） */}
          <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-center">
            <TopIcon icon="grass-left" sizes="64px" className="w-12 sm:w-16 lg:hidden" />
            <ResumeLastView />
            <TopIcon icon="grass-right" sizes="64px" className="w-11 sm:w-14 lg:hidden" />
          </div>
        </div>
      </div>

      <TopIcon icon="grass-left" sizes="96px" className="absolute -bottom-10 -left-2 hidden w-24 lg:block" />
      <TopIcon icon="grass-right" sizes="64px" className="absolute -bottom-6 right-0 hidden w-16 lg:block" />
    </section>
  );
}
