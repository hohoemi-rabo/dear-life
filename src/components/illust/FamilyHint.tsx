import { spriteSrc, type SpriteId } from "@/lib/illust/assets";

// 家族の人数の下に置く小さな案内（028 見本）：大人2人から点線の矢印で、跳ねる子どもへ。「人数を変えると、家族も変わります。」
export function FamilyHint() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div aria-hidden="true" className="flex items-end gap-1">
        <Sprite id="father-stand" />
        <Sprite id="mother-stand" />
        <svg viewBox="0 0 64 24" className="mx-1 mb-6 h-6 w-16 text-ink-muted">
          <path d="M2 20 Q32 -4 58 14" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
          <path d="M52 8 L60 15 L50 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="relative">
          <Sprite id="boy-joy" small />
          <Star className="-left-2 top-0" />
          <Star className="-right-2 top-3" />
        </span>
      </div>
      <p className="text-sm text-ink-muted">人数を変えると、家族も変わります。</p>
    </div>
  );
}

function Sprite({ id, small = false }: { id: SpriteId; small?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 切り出した小さな WebP をそのまま出す
    <img src={spriteSrc(id)} alt="" draggable={false} className={`w-auto select-none ${small ? "h-11" : "h-14"}`} />
  );
}

function Star({ className }: { className: string }) {
  return (
    <span
      className={`absolute size-2.5 bg-gold [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)] ${className}`}
    />
  );
}
