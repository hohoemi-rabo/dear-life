import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "accent" | "quiet";

const BASE =
  "inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-button px-5 py-2 text-base font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border-2 border-primary bg-surface text-primary hover:bg-primary-soft",
  // 緑の画面の中で目立たせたい1つだけのボタン（030 新しい版のお知らせの「更新する」。2026-11-06 まさゆきさん）。
  // 白い文字との色の差は約4.9:1
  accent: "bg-autumn text-white hover:brightness-90",
  // 目立たせたいボタンの横に置く、控えめなボタン
  quiet: "border-2 border-line bg-surface text-ink hover:bg-kinari-deep",
};

export function buttonClassName(variant: Variant, className?: string): string {
  return [BASE, VARIANTS[variant], className].filter(Boolean).join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
