// 選んだものが出てきたときのキラキラ（028）。親の絵の幅・高さに対する％の位置に、少しずつずらして散らす。
// 「動きを減らす」では出さない
export type SparklePoint = { x: number; y: number; delay: number };

export function Sparkles({ points }: { points: readonly SparklePoint[] }) {
  return points.map(({ x, y, delay }) => (
    <span
      key={`${x}-${y}`}
      className="absolute hidden size-3 bg-gold motion-safe:block motion-safe:animate-sparkle [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]"
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}ms` }}
    />
  ));
}
