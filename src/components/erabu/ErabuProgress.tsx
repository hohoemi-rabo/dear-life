import type { Conditions } from "@/lib/conditions/model";
import { canOpenQuestion, QUESTIONS, type QuestionId } from "@/lib/erabu/questions";

// えらぶの進み具合（028 見本）。番号の丸5つを線でつなぎ、下に名前を付ける。
// 終わった質問は ✓、今の質問は番号を緑の丸に。答えた質問・今の質問には押して戻れる。地区を選ぶまでは後ろを押せない
export function ErabuProgress({
  current,
  conditions,
  onOpen,
}: {
  current: QuestionId;
  conditions: Conditions;
  onOpen: (id: QuestionId) => void;
}) {
  const currentIndex = QUESTIONS.findIndex(({ id }) => id === current);
  return (
    <ol aria-label="質問" className="flex items-start justify-between">
      {QUESTIONS.map(({ id, stepLabel }, index) => {
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li
            key={id}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "relative flex flex-1 justify-center",
              // 前の丸からの線。終わったところは実線、まだのところは点線（読み上げない飾り）
              index > 0
                ? `before:absolute before:right-1/2 before:top-[17px] before:w-[calc(100%-2rem)] before:-translate-x-4 before:border-t-2 ${
                    index <= currentIndex ? "before:border-primary" : "before:border-dotted before:border-line"
                  }`
                : "",
            ].join(" ")}
          >
            <button
              type="button"
              disabled={!canOpenQuestion(id, conditions)}
              onClick={() => onOpen(id)}
              className="group relative flex min-h-tap min-w-tap flex-col items-center gap-1 rounded-button px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            >
              <span
                aria-hidden="true"
                className={[
                  "flex size-7 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-transform duration-150 group-enabled:group-active:scale-95",
                  done || isCurrent ? "bg-primary text-white" : "border-2 border-line bg-surface text-ink-muted",
                  isCurrent ? "ring-4 ring-primary-soft" : "",
                ].join(" ")}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={`whitespace-nowrap text-xs ${isCurrent ? "font-bold text-primary" : "text-ink-muted"}`}>
                {stepLabel}
                {done && <span className="sr-only">（答えた）</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
