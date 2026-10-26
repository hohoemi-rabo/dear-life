// ひな形の下書き（drafts.ts）を scene_templates・scene_sentences に入れるマイグレーションの SQL（npm run scenes:sql）。
// 毎回すべて消して入れ直す（ひな形の id は画面のキーにしか使わないので変わってよい）
import { sqlLiteral } from "../sql.ts";
import { checkTemplates, type SceneTemplateDraft } from "./check.ts";

function nullableBoolean(value: boolean | null): string {
  return value === null ? "null" : String(value);
}

function templateSql(template: SceneTemplateDraft): string {
  const rows = template.sentences.map((s) =>
    [
      s.position,
      `${sqlLiteral(s.kind)}::public.sentence_kind`,
      sqlLiteral(s.body),
      sqlLiteral(s.fallback_body),
      `${sqlLiteral(s.karte_card)}::public.karte_card`,
      sqlLiteral(s.source_id),
      `${nullableBoolean(s.has_children)}::boolean`,
      `${sqlLiteral(s.car)}::public.car_choice`,
      `${sqlLiteral(s.housing)}::public.housing_choice`,
    ].join(", "),
  );
  return `with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values (${[
    `${sqlLiteral(template.season)}::public.season`,
    `${nullableBoolean(template.has_children)}::boolean`,
    `${sqlLiteral(template.car)}::public.car_choice`,
    `${sqlLiteral(template.housing)}::public.housing_choice`,
    sqlLiteral(template.title),
    `${sqlLiteral(template.reviewed_on)}::date`,
    String(template.reviewed_on !== null),
  ].join(", ")})
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
${rows.map((row) => `  (${row})`).join(",\n")}
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);`;
}

// 決まりごとに合わないひな形があれば、書き出さずに止める（想定の文の数字・施設名、文の数など）
export function buildSceneTemplatesSql(templates: readonly SceneTemplateDraft[]): string {
  const problems = checkTemplates(templates);
  if (problems.length > 0) throw new Error(`ひな形を直してください：\n  ${problems.join("\n  ")}`);
  return `-- 017 場面のひな形（npm run scenes:sql が src/lib/scenes/drafts.ts から作る。手で編集しない）
-- 確認日（reviewed_on）の入ったひな形だけが公開される

delete from public.scene_templates;

${templates.map(templateSql).join("\n\n")}
`;
}
