// 場面のひな形の下書き（src/lib/scenes/drafts.ts）から、scene_templates・scene_sentences を入れ直すマイグレーションを作る（チケット 017）。
// 使い方：npm run scenes:sql
//   決まりごと（想定の文に数字・施設名を入れない、季節×条件ごとに3〜5文など）に合わなければ、書き出さずに止める
import { SCENE_TEMPLATE_DRAFTS } from "../src/lib/scenes/drafts.ts";
import { buildSceneTemplatesSql } from "../src/lib/scenes/sql.ts";
import { writeMigrationIfChanged } from "./lib/city-open-data.mjs";

writeMigrationIfChanged("_scene_templates_data.sql", buildSceneTemplatesSql(SCENE_TEMPLATE_DRAFTS));
