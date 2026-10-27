"use client";

import { usePathname } from "next/navigation";
import { STEPS } from "@/lib/site";

// 条件は URL パラメータで持つため（F-02）、ステップはリンクにせず今どこにいるかだけを示す。
// スマホは線の上の丸印3つと下のラベル、PC は大きなタブを「···」でつなぐ（027 デザインイメージ）
export function StepIndicator() {
  const pathname = usePathname();
  const currentPath = STEPS.find(
    (step) => pathname === step.path || pathname.startsWith(`${step.path}/`),
  )?.path;

  return (
    <ol
      aria-label="進みぐあい"
      className="relative flex w-full before:absolute before:inset-x-[16%] before:top-[7px] before:h-0.5 before:bg-line md:w-auto md:items-center md:gap-0 md:before:hidden"
    >
      {STEPS.map((step, index) => {
        const isCurrent = step.path === currentPath;
        return (
          <li
            key={step.path}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "relative flex flex-1 flex-col items-center gap-1 md:flex-none md:flex-row",
              // PC：2つ目からは前に「···」を置く（読み上げない飾りなので CSS で出す）
              index > 0 ? "md:before:mx-2 md:before:text-ink-muted md:before:content-['···']" : "",
            ].join(" ")}
          >
            <span
              className={[
                "size-4 rounded-full border-2 md:hidden",
                isCurrent ? "border-primary bg-primary ring-4 ring-primary-soft" : "border-line bg-surface",
              ].join(" ")}
            />
            <span
              className={[
                "flex gap-1 whitespace-nowrap text-xs md:rounded-button md:px-5 md:py-2 md:text-base",
                isCurrent ? "font-bold text-primary md:bg-primary md:text-white" : "text-ink-muted md:bg-kinari-deep",
              ].join(" ")}
            >
              <span className="tabular-nums">{step.number}</span>
              <span>{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
