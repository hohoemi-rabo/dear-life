import type { CarCount } from "@/lib/conditions/labels";
import { PROP_SIZES, SPRITE_SIZES } from "@/lib/illust/sprites";
import { PROP_WIDTHS, propSrc, propSrcSet, spriteId, spriteSrc, type Person, type PropId } from "@/lib/illust/assets";

// 車の選択肢のカードの絵（028 見本の 04）。用意された小物と人物を組み合わせて作る（2026-10-29 まさゆきさん）：
// 0台はバス停と家族、1台は白い車と家族、2台以上は白い車と青い車を横に並べる。家族は選んだ人数のまま（立つポーズ）。
// 置き場所は絵の枠（正方形〜4:3）に対する％。絵は飾りで、カードの名前で読み上げる
export function CarChoicePicture({ car, members }: { car: CarCount; members: readonly Person[] }) {
  return (
    <span aria-hidden="true" className="relative block size-full">
      {car === 0 && (
        <>
          <Prop prop="bus-stop" left={28} width={72} />
          <Family members={members} left={0} height={74} />
        </>
      )}
      {car === 1 && (
        <>
          <Prop prop="car-white" left={0} width={66} />
          <Family members={members} right={0} height={72} />
        </>
      )}
      {car === 2 && (
        <>
          <Prop prop="car-white" left={2} width={50} />
          <Prop prop="car-blue" left={46} width={50} />
        </>
      )}
    </span>
  );
}

// 小物（車・バス停）。left・width は枠の幅に対する％、raise は下からの高さ（％）。高さは絵の縦横の比のまま
function Prop({ prop, left, width, raise = 0 }: { prop: PropId; left: number; width: number; raise?: number }) {
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
      className="absolute h-auto select-none"
      style={{ left: `${left}%`, bottom: `${raise}%`, width: `${width}%` }}
    />
  );
}

// 家族を並べる。left か right（枠の幅に対する％）で寄せる側を決める。height はお父さん（立つ）の背の高さ（枠の高さに対する％）。
// 子どもは絵の背の比で小さくなる。4人のときは車やバス停に少し重なる（見本のカードも重なっている）
function Family({ members, left, right, height }: { members: readonly Person[]; left?: number; right?: number; height: number }) {
  const reference = SPRITE_SIZES["father-stand"].height;
  return (
    <span
      className="absolute bottom-0 flex h-full items-end"
      style={right === undefined ? { left: `${left ?? 0}%` } : { right: `${right}%` }}
    >
      {members.map((person, index) => {
        const id = spriteId(person, "stand");
        return (
          // eslint-disable-next-line @next/next/no-img-element -- 切り出した小さな WebP をそのまま出す（高さを割合で決めるため）
          <img
            key={person}
            src={spriteSrc(id)}
            alt=""
            draggable={false}
            decoding="async"
            className="w-auto max-w-none select-none"
            style={{ height: `${(SPRITE_SIZES[id].height / reference) * height}%`, marginLeft: index === 0 ? 0 : "-6%" }}
          />
        );
      })}
    </span>
  );
}
