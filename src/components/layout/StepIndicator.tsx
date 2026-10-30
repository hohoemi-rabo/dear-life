"use client";

import { usePathname } from "next/navigation";
import { STEPS } from "@/lib/site";

// 条件は URL パラメータで持つため（F-02）、ステップはリンクにせず今どこにいるかだけを示す。
// 028 見本：番号は付けず、名前を「›」（スマホ）・「→」（PC）でつなぎ、今のステップを太字の深緑と下線で示す
export function StepIndicator() {
  const pathname = usePathname();
  const currentPath = STEPS.find(
    (step) => pathname === step.path || pathname.startsWith(`${step.path}/`),
  )?.path;

  return (
    <ol aria-label="進みぐあい" className="flex w-full items-center justify-center md:w-auto">
      {STEPS.map((step, index) => {
        const isCurrent = step.path === currentPath;
        return (
          <li
            key={step.path}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "flex items-center",
              // 2つ目からは前に「›」「→」を置く（読み上げない飾りなので CSS で出す）
              index > 0 ? "before:mx-3 before:text-ink-muted before:content-['›'] md:before:mx-5 md:before:content-['→']" : "",
            ].join(" ")}
          >
            <span
              className={[
                "whitespace-nowrap border-b-[3px] px-1 py-1.5 text-sm md:text-base",
                isCurrent ? "border-primary font-bold text-primary" : "border-transparent text-ink-muted",
              ].join(" ")}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
