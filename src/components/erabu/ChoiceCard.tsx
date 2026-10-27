import type { ReactNode } from "react";

// 選択肢のカード。押すと選ぶ（もう一度押すと外すかどうかは呼ぶ側で決める）。
// 選んだものは枠を太くし、チェックの印を付ける。色だけに頼らないよう、印と aria-pressed でも伝える。
// 絵のあるカードは上半分を空の色にして絵を大きく出し、下に「選んだ／選べる」の丸い印を置く（027 デザインイメージ）。
// 印は飾りなので読み上げず、ボタンの名前は「ラベル＋説明」のまま
export function ChoiceCard({
  selected,
  onSelect,
  art,
  label,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  art?: ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "relative flex min-h-tap w-full flex-col items-center overflow-hidden rounded-card border-2 bg-surface text-center transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        art ? "gap-1 pb-3" : "justify-center gap-2 px-2 py-3",
        selected ? "border-primary bg-primary-soft" : "border-line hover:border-primary/50",
      ].join(" ")}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
        >
          ✓
        </span>
      )}
      {art && (
        // 絵の下に地面を敷き、絵が空の端で切れて見えないようにする
        <span className="mb-1 flex h-28 w-full flex-col items-center justify-end bg-pixel-sky pt-2">
          {art}
          <span aria-hidden="true" className="h-2 w-full shrink-0 bg-pixel-grass" />
        </span>
      )}
      <span className="px-1 text-sm font-bold sm:text-base">{label}</span>
      {description && <span className="px-1 text-xs text-ink-muted">{description}</span>}
      {art && (
        <span
          aria-hidden="true"
          className={[
            "mt-auto flex size-7 items-center justify-center rounded-full border-2 text-sm font-bold",
            selected ? "border-primary bg-primary text-white" : "border-line text-ink-muted",
          ].join(" ")}
        >
          {selected ? "✓" : "›"}
        </span>
      )}
    </button>
  );
}
