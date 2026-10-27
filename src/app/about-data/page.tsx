import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ManualDataList, MarketCounts, SourceList } from "@/components/about/AboutDataLive";
import { DataStateLegend } from "@/components/data/DataStateMessage";
import { Card } from "@/components/ui/Card";
import { countLabel } from "@/lib/count-label";
import { GSI_TILES, LANDSAT_CREDIT, PERSONAL_SERVICE_NOTE, REINFOLIB_API_CREDIT } from "@/lib/credits";
import { EXAMPLE_LAND_AREA, SQUARE_METERS_PER_TSUBO } from "@/lib/karte/housing";
import { NOTICES } from "@/lib/notices";
import { TARGET_DISTRICTS_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "データについて",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {children}
    </Card>
  );
}

// 利用上の注意（要件 8章「表示の注意書き」）。各画面に出しているものを、ここにもまとめて出す
const USAGE_NOTICES = [NOTICES.market, NOTICES.mapPosition, NOTICES.schoolDistrict, NOTICES.support, NOTICES.events, NOTICES.carFree];

// 件数ラベルの区切り（要件 5章-6）。判定は countLabel だけにあるので、そこから文言を引く
const COUNT_LABEL_RULES = [
  ["30件以上", countLabel(30).text],
  ["11〜29件", countLabel(11).text],
  ["10件以下", countLabel(10).text],
] as const;

// データについて（022・F-08・7.3）。出典・対象時点・確認日・集計方法・クレジットをまとめる。
// 出典の一覧と件数はデータベースから読み、ほかの説明は読み込みを待たずに出す
export default function AboutDataPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">データについて</h1>
      <p>このページでは、画面に出している情報の出典・対象時点・確認日と、相場の計算のしかたをまとめています。</p>

      <Section id="about-service" title="このサービスについて">
        <p className="font-bold">{PERSONAL_SERVICE_NOTE}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>対象は飯田市の{TARGET_DISTRICTS_LABEL}の4地区だけです。点数やランキング、おすすめの地区は出しません。</li>
          <li>会員登録はありません。選んだ条件はページのアドレス（URL）にだけ入り、サーバーには送らず、保存もしません。</li>
          <li>アクセス解析（利用者の行動を記録するしくみ）は入れていません。</li>
        </ul>
      </Section>

      <Section id="about-notices" title="利用上の注意">
        <ul className="list-disc space-y-1 pl-5">
          {USAGE_NOTICES.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </Section>

      <Section id="about-states" title="「該当なし」と「データ未取得」">
        <DataStateLegend place="その地区" />
      </Section>

      <Section id="about-market" title="住まいの相場の計算のしかた">
        <p>
          国土交通省 不動産情報ライブラリの取引価格情報（飯田市）を、地区ごとに集計しています。現在の売り出し価格ではなく、過去の取引の参考値です。
        </p>
        <MarketCounts />
        <ol className="list-decimal space-y-2 pl-5">
          <li>対象期間は、いちばん新しい四半期から20四半期前まで（両端を含む約5年分）です。新しい四半期が公開されたら、古い四半期を外して計算し直します。</li>
          <li>取引の町名を、町名と地区の対応表に当てはめて地区に振り分けます。</li>
          <li>「調停・競売等」「関係者間取引」「隣地の購入」の取引は、ふつうの売り買いと値段の決まり方が違うため除いています。</li>
          <li>
            土地は種類が「宅地(土地)」の取引で、1㎡あたりの値段の真ん中の値と、下位25%〜上位25%の幅を出します。1㎡あたりの値段がない取引は、総額を面積で割って補います。坪単価（1坪＝
            {SQUARE_METERS_PER_TSUBO}㎡）と、{EXAMPLE_LAND_AREA}㎡（約60坪）のときの目安も添えます。
          </li>
          <li>
            中古戸建ては種類が「宅地(土地と建物)」で、用途に住宅を含む（または空欄の）取引です。築年数（取引の年−建てた年）で「築20年以内」「築21年以上」に分け、総額の真ん中の値を出します。建てた年がわからない取引はどちらにも入れません。
          </li>
          <li>「真ん中の値」は、値段を安い順に並べたときにちょうど真ん中に来る値（中央値）です。極端に高い・安い取引に引っぱられにくい値です。</li>
          <li>
            すべての値に件数を付けています。
            <ul className="mt-1 list-disc pl-5">
              {COUNT_LABEL_RULES.map(([range, label]) => (
                <li key={range}>
                  {range}：「{label}」
                </li>
              ))}
            </ul>
          </li>
        </ol>
      </Section>

      <Section id="about-sources" title="出典">
        <p>{REINFOLIB_API_CREDIT}</p>
        <p className="text-sm text-ink-muted">
          自動で取り込むデータは取得日、手で確かめたデータは確認日を出しています。どのデータも、元のデータを地区ごとにまとめるなど加工して使っています。
        </p>
        <SourceList />
      </Section>

      <Section id="about-manual" title="手でまとめた情報">
        <ManualDataList />
        <section aria-labelledby="about-scenes" className="flex flex-col gap-2">
          <h3 id="about-scenes" className="font-bold">
            くらしの場面の文章
          </h3>
          <p>
            季節と条件ごとのひな形に、上の出典のデータを差し込んで作っています。文には「データ」「地区の情報」「想定」の印を付けています。「想定」は場面をつなぐための作った文で、数字・施設名・地区の評価は入れていません。
          </p>
        </section>
      </Section>

      <Section id="about-map" title="地図">
        <p>背景の地図・航空写真・標高は、国土地理院の地理院タイルを使っています。</p>
        <a
          href={GSI_TILES.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-tap items-center self-start font-bold text-primary underline underline-offset-4"
        >
          {GSI_TILES.name}
        </a>
        <p className="text-sm text-ink-muted">航空写真（広い範囲）：{LANDSAT_CREDIT}</p>
        <p className="text-sm text-ink-muted">{NOTICES.mapPosition}施設の位置は、上の出典の緯度経度や住所をもとにしています。</p>
      </Section>
    </div>
  );
}
