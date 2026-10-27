-- 017 場面のひな形（npm run scenes:sql が src/lib/scenes/drafts.ts から作る。手で編集しない）
-- 確認日（reviewed_on）の入ったひな形だけが公開される

delete from public.scene_templates;

with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values ('春'::public.season, true::boolean, null::public.car_choice, null::public.housing_choice, '春・子どもあり・入園と入学', '2026-10-27'::date, true)
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
  (1, '想定'::public.sentence_kind, '春、入園と入学の季節です。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (2, 'データ'::public.sentence_kind, '{地区名}には、保育園・幼稚園等が{保育施設の数}か所あります。', null, '子育て・学校'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (3, 'データ'::public.sentence_kind, 'たとえば{保育施設名}（{保育施設の住所}）です。', 'たとえば{保育施設名}です。', '子育て・学校'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (4, 'データ'::public.sentence_kind, '小学校は主に{小学校区}、中学校は主に{中学校区}の学区になります。', '小学校は主に{小学校区}の学区になります。', '子育て・学校'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (5, '想定'::public.sentence_kind, '家族で、新しい毎日の準備をします。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice)
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);

with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values ('春'::public.season, false::boolean, null::public.car_choice, null::public.housing_choice, '春・子どもなし・地区の公共施設', '2026-10-27'::date, true)
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
  (1, '想定'::public.sentence_kind, '春、あたたかくなって、地区の中を見てまわります。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (2, 'データ'::public.sentence_kind, '{地区名}には、公民館や図書館、公園などの公共施設が{公共施設の数}か所あります。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (3, 'データ'::public.sentence_kind, 'たとえば{公共施設名}（{公共施設の住所}）があります。', 'たとえば{公共施設名}があります。', null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (4, '想定'::public.sentence_kind, '休みの日の過ごし方を、家族で話します。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice)
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);

with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values ('夏'::public.season, null::boolean, null::public.car_choice, null::public.housing_choice, '夏・大雨と避難', '2026-10-27'::date, true)
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
  (1, '想定'::public.sentence_kind, '夏、強い雨が降りつづく日があります。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (2, 'データ'::public.sentence_kind, '{地区名}には、市の指定緊急避難場所が{避難場所の数}か所あります。', null, '防災'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (3, 'データ'::public.sentence_kind, 'そのうち洪水と土砂災害の両方に使える場所は{大雨の避難場所の数}か所で、たとえば{大雨の避難場所名}（{大雨の避難場所の住所}）です。', 'そのうち洪水と土砂災害の両方に使える場所は{大雨の避難場所の数}か所で、たとえば{大雨の避難場所名}です。', '防災'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (4, '想定'::public.sentence_kind, '家族で、避難する場所と道すじを話しておきます。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice)
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);

with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values ('秋'::public.season, null::boolean, null::public.car_choice, null::public.housing_choice, '秋・地区の行事', '2026-10-27'::date, true)
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
  (1, '想定'::public.sentence_kind, '秋、地区の行事の季節です。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (2, '地区の情報'::public.sentence_kind, '{地区名}では、{行事の時期}に{行事名}があります。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (3, 'データ'::public.sentence_kind, '{地区名}に住んでいる人は{人口}人で、そのうち14歳以下は{子どもの人口}人です（{人口の時点}）。', '{地区名}に住んでいる人は{人口}人です（{人口の時点}）。', '人口'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (4, '想定'::public.sentence_kind, '家族で、行事の日をカレンダーに書きこみます。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice)
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);

with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values ('冬'::public.season, null::boolean, '車なし'::public.car_choice, null::public.housing_choice, '冬・車なし・バスと電車でおでかけ', '2026-10-27'::date, true)
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
  (1, '想定'::public.sentence_kind, '冬の休みの日、車を使わずに出かけます。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (2, 'データ'::public.sentence_kind, '{バスの曜日}、{バスの乗り場}を{バスの発車時刻}に出るバスに乗り、{バスの到着時刻}に{バスの降り場}に着きます。', null, '交通'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (3, 'データ'::public.sentence_kind, '{バスの乗り場}から{バスの降り場}へ乗りかえなしで行くバスは、この日は1日{バスの本数}本です。帰りは{バスの帰りの発車時刻}発、その次の便は{バスの次の便の時刻}発です。', '{バスの乗り場}から{バスの降り場}へ乗りかえなしで行くバスは、この日は1日{バスの本数}本です。帰りは{バスの帰りの発車時刻}発で、そのあとの帰りの便はありません。', '交通'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (4, 'データ'::public.sentence_kind, '電車なら、{電車の乗り場}駅を{電車の発車時刻}に出る{電車の種別}で、{電車の到着時刻}に{電車の降り場}駅に着きます。{電車の降り場}駅へ行く電車は特急を除いて1日{電車の本数}本で、帰りは{電車の帰りの発車時刻}発、その次は{電車の次の便の時刻}発です。', '電車なら、{電車の乗り場}駅を{電車の発車時刻}に出る{電車の種別}で、{電車の到着時刻}に{電車の降り場}駅に着きます。{電車の降り場}駅へ行く電車は特急を除いて1日{電車の本数}本で、帰りは{電車の帰りの発車時刻}発、そのあとの帰りの便はありません。', '交通'::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (5, '想定'::public.sentence_kind, '古い家では、朝の冷えこみを部屋の中でも感じることがあります。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, '買う・古め'::public.housing_choice)
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);

with template as (
  insert into public.scene_templates (season, has_children, car, housing, title, reviewed_on, is_published)
  values ('冬'::public.season, null::boolean, '車あり・未選択'::public.car_choice, null::public.housing_choice, '冬・車あり・雪と路面の凍結', '2026-10-27'::date, true)
  returning id
)
insert into public.scene_sentences (template_id, position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing)
select template.id, v.*
from template, (values
  (1, '想定'::public.sentence_kind, '冬の朝、車で出かけます。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice),
  (2, 'データ'::public.sentence_kind, '飯田市では、近年は雪が降っても積もるのは10cmほどですが、ひと冬に2〜3回は雪かきが要るとされています。', null, null::public.karte_card, 'rakuen_shinshu_iida_sheet', null::boolean, null::public.car_choice, null::public.housing_choice),
  (3, 'データ'::public.sentence_kind, '朝晩は氷点下になって路面が凍るため、車を持つならスタッドレスタイヤが欠かせないとされています。', null, null::public.karte_card, 'rakuen_shinshu_iida_sheet', null::boolean, null::public.car_choice, null::public.housing_choice),
  (4, '想定'::public.sentence_kind, '古い家では、朝の冷えこみを部屋の中でも感じることがあります。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, '買う・古め'::public.housing_choice),
  (5, '想定'::public.sentence_kind, '出かける前に、車の窓の霜をとかします。', null, null::public.karte_card, null, null::boolean, null::public.car_choice, null::public.housing_choice)
) as v (position, kind, body, fallback_body, karte_card, source_id, has_children, car, housing);
