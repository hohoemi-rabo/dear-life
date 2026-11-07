import { TopDistricts } from "@/components/top/TopDistricts";
import { TopHero } from "@/components/top/TopHero";
import { TopNotes } from "@/components/top/TopNotes";
import { TopSteps } from "@/components/top/TopSteps";

// 入口（033 見本 docs/design/top-pc.png）。大きな絵と「わが家の暮らしをつくる」でえらぶへつなぎ、
// 「風景はイメージ、数字は公開データ」を最初に伝え、4地区のカードからも始められるようにする
export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <TopHero />
      <TopNotes />
      <TopSteps />
      <TopDistricts />
    </div>
  );
}
