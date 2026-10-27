import { ResumeLastView } from "@/components/pwa/ResumeLastView";
import { ButtonLink } from "@/components/ui/Button";
import { ERABU_PATH, SITE_CATCHPHRASE, TARGET_DISTRICTS_LABEL } from "@/lib/site";

// 入口。暮らし方を選ぶ「01 えらぶ」へつなぐ。前に見た画面があれば、そこへ戻るボタンも出す（024）
export default function Home() {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{SITE_CATCHPHRASE}</h1>
      <p>
        家族・地区・家・車を選ぶと、その条件で過ごす飯田の春夏秋冬をのぞけます。数字は公開データの本物を、出典つきで出します。登録はいりません。
      </p>
      <p className="text-sm font-bold">対象地区：{TARGET_DISTRICTS_LABEL}</p>
      <ButtonLink href={ERABU_PATH} className="self-start">
        暮らし方をえらぶ
        <span aria-hidden="true">→</span>
      </ButtonLink>
      <ResumeLastView />
    </section>
  );
}
