import { SITE_CATCHPHRASE, TARGET_DISTRICTS_LABEL } from "@/lib/site";

// 入口（01 えらぶ）は 016 で作る。それまでは共通レイアウトだけを出す
export default function Home() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold">{SITE_CATCHPHRASE}</h1>
      <p className="text-ink-muted">{TARGET_DISTRICTS_LABEL}の4地区の暮らしを、準備しています。</p>
    </section>
  );
}
