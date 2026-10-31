import type { CarCount } from "@/lib/conditions/labels";
import { PROP_SIZES } from "@/lib/illust/sprites";
import { PROP_WIDTHS, propSrc, propSrcSet, type PropId } from "@/lib/illust/assets";

// 車の選択肢のカードの絵（028 見本の 04）。用意された小物を組み合わせて作る（2026-10-29 まさゆきさん）：
// 0台はバス停、1台は白い車、2台以上は白い車と青い車を横に並べる。
// 見本では家族もいたが、子どもを4人まで選べるようにしたら車やバス停が隠れたので、カードには家族を出さない（2026-10-31 まさゆきさん）。
// 置き場所は絵の枠（正方形〜4:3）に対する％。絵は飾りで、カードの名前で読み上げる
export function CarChoicePicture({ car }: { car: CarCount }) {
  return (
    <span aria-hidden="true" className="relative block size-full">
      {car === 0 && <Prop prop="bus-stop" left={14} width={72} />}
      {car === 1 && <Prop prop="car-white" left={20} width={60} />}
      {car === 2 && (
        <>
          <Prop prop="car-white" left={2} width={50} />
          <Prop prop="car-blue" left={46} width={50} />
        </>
      )}
    </span>
  );
}

// 小物（車・バス停）。left・width は枠の幅に対する％。高さは絵の縦横の比のまま
function Prop({ prop, left, width }: { prop: PropId; left: number; width: number }) {
  const size = PROP_SIZES[prop];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由）
    <img
      src={propSrc(prop, PROP_WIDTHS[0])}
      srcSet={propSrcSet(prop)}
      sizes="(min-width: 640px) 120px, 22vw"
      alt=""
      width={size.width}
      height={size.height}
      draggable={false}
      decoding="async"
      className="absolute bottom-0 h-auto select-none"
      style={{ left: `${left}%`, width: `${width}%` }}
    />
  );
}
