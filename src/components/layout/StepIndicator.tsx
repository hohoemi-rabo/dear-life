"use client";

import { usePathname } from "next/navigation";
import { STEPS } from "@/lib/site";

// 条件は URL パラメータで持つため（F-02）、ステップはリンクにせず今どこにいるかだけを示す
export function StepIndicator() {
  const pathname = usePathname();
  const currentPath = STEPS.find(
    (step) => pathname === step.path || pathname.startsWith(`${step.path}/`),
  )?.path;

  return (
    <ol aria-label="進みぐあい" className="flex w-full items-center gap-1 md:w-auto md:gap-2">
      {STEPS.map((step) => {
        const isCurrent = step.path === currentPath;
        return (
          <li
            key={step.path}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-xs md:flex-none md:px-4 md:text-sm",
              isCurrent ? "bg-primary font-bold text-white" : "bg-kinari-deep text-ink-muted",
            ].join(" ")}
          >
            <span className="tabular-nums">{step.number}</span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
