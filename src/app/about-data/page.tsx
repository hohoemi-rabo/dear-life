import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "データについて",
};

// ヘッダー・フッターのリンク先を先に用意しておく。中身は 022 で作る
export default function AboutDataPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold">データについて</h1>
      <p className="text-ink-muted">出典・対象時点・集計方法をまとめたページを準備しています。</p>
    </section>
  );
}
