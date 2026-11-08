import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { Card } from "@/components/ui/Card";
import { ABOUT_DATA_PATH } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ",
};

// お問い合わせ（035・要件 F-15）。本文だけを受け、名前・メールアドレスは聞かない（返信はしない）
export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-extrabold">お問い合わせ</h1>
      <Card as="section" aria-labelledby="contact-about" className="flex flex-col gap-2">
        <h2 id="contact-about" className="text-lg font-bold">
          送る前に
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>データの誤りや、使い方の質問・感想などを送れます。</li>
          <li>返信はできません。いただいた内容は、サービスを直すときの参考にします。</li>
          <li className="font-bold">お名前・住所・電話番号・メールアドレスなど、個人が分かることは書かないでください。</li>
          <li>
            出典や数字の計算のしかたは「
            <Link href={ABOUT_DATA_PATH} className="font-bold text-primary underline underline-offset-4">
              データについて
            </Link>
            」にまとめています。
          </li>
        </ul>
      </Card>
      <Card>
        <ContactForm />
      </Card>
    </div>
  );
}
