import type { ReactNode } from "react";

// 選択肢のカード。押すと選ぶ（もう一度押すと外すかどうかは呼ぶ側で決める）。
// 選んだものは枠を太くし、チェックの印を付ける。色だけに頼らないよう、印と aria-pressed でも伝える
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
        "relative flex min-h-tap w-full flex-col items-center justify-center gap-2 rounded-card border-2 bg-surface px-2 py-3 text-center transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "border-primary bg-primary-soft" : "border-line hover:border-primary/50",
      ].join(" ")}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
        >
          ✓
        </span>
      )}
      {art && <span className="flex h-16 items-end justify-center">{art}</span>}
      <span className="text-sm font-bold sm:text-base">{label}</span>
      {description && <span className="text-xs text-ink-muted">{description}</span>}
    </button>
  );
}
