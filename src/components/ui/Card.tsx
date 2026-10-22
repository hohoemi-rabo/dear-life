import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div"> & {
  as?: "div" | "section" | "article";
};

// 実データの側の枠。ドット風にはせず、基本色の角丸カードにする（要件 8.1）
export function Card({ as: Tag = "div", className, ...props }: CardProps) {
  return (
    <Tag
      className={["rounded-card border border-line bg-surface p-4 shadow-card", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
