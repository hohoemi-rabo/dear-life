// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// supabase/migrations の SQL を手元の Postgres（PGlite）に当て、権限（要件 9.4）と入力の制約を確かめる。
// 本番の Supabase と同じ「新しいテーブルに anon / authenticated の全権限が付く」既定を再現してから当てる
const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");

type Role = "anon" | "authenticated" | "service_role" | "postgres";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  // 公開済みと未公開の出典を1つずつ用意する
  await db.exec(`
    insert into data_sources (id, name, publisher, is_published) values
      ('published_src', '公開済み', 'テスト', true),
      ('draft_src', '確認中', 'テスト', false);
  `);
}, 30_000);

afterAll(async () => {
  await db?.close();
});

// 1つのテストの変更は必ず巻き戻し、テストの順番に依存しないようにする
async function run<T = Record<string, unknown>>(role: Role, ...statements: string[]): Promise<T[]> {
  await db.exec("begin");
  try {
    let rows: T[] = [];
    for (const [i, sql] of statements.entries()) {
      // 最後の文だけを指定のロールで実行し、それまでの文は準備として postgres で実行する
      if (i === statements.length - 1 && role !== "postgres") await db.exec(`set local role ${role}`);
      rows = (await db.query<T>(sql)).rows;
    }
    return rows;
  } finally {
    await db.exec("rollback");
  }
}

const PUBLIC_TABLES = [
  "districts",
  "data_sources",
  "town_district_map",
  "market_stats",
  "facilities",
  "school_districts",
  "population",
  "support_programs",
  "district_events",
  "scene_templates",
  "scene_sentences",
];
const PRIVATE_TABLES = ["ingest_runs", "unmapped_towns", "real_estate_transactions"];

describe("権限（要件 9.4）", () => {
  it("すべてのテーブルで RLS が有効になっている", async () => {
    const rows = await run<{ relname: string }>(
      "postgres",
      `select relname from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("anon は画面に見せる表だけ select でき、それ以外の権限を持たない", async () => {
    const rows = await run<{ table_name: string; privilege_type: string }>(
      "postgres",
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public' order by table_name`,
    );
    expect(rows.every((r) => r.privilege_type === "SELECT")).toBe(true);
    expect(rows.map((r) => r.table_name).sort()).toEqual([...PUBLIC_TABLES].sort());
  });

  it("service_role は全テーブルで select / insert / update / delete だけを持つ", async () => {
    const rows = await run<{ table_name: string; privs: string }>(
      "postgres",
      `select table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
       from information_schema.role_table_grants
       where grantee = 'service_role' and table_schema = 'public' group by table_name`,
    );
    expect(rows).toHaveLength(PUBLIC_TABLES.length + PRIVATE_TABLES.length);
    expect(new Set(rows.map((r) => r.privs))).toEqual(new Set(["DELETE,INSERT,SELECT,UPDATE"]));
  });

  it("authenticated には何も与えていない", async () => {
    const rows = await run(
      "postgres",
      `select 1 from information_schema.role_table_grants
       where grantee = 'authenticated' and table_schema = 'public'`,
    );
    expect(rows).toEqual([]);
  });

  it.each(PRIVATE_TABLES)("anon は非公開の %s を読めない", async (table) => {
    await expect(run("anon", `select * from ${table}`)).rejects.toThrow(/permission denied/);
  });

  it.each([
    "insert into districts values ('x', 'x', 9, 'x')",
    "update districts set name = 'x'",
    "delete from districts",
    "insert into district_events (district_id, name, season, timing_note, scope, source_note, checked_on) values ('kanae', 'x', '秋', 'x', '地区全体', 'x', '2026-10-22')",
  ])("anon は書き込めない：%s", async (sql) => {
    await expect(run("anon", sql)).rejects.toThrow(/permission denied/);
  });

  it("anon は共通の関数を呼べない", async () => {
    await expect(run("anon", "select public.set_updated_at()")).rejects.toThrow(/permission denied/);
  });

  it("anon は4地区を並び順どおりに読める", async () => {
    const rows = await run<{ name: string }>("anon", "select name from districts order by sort_order");
    expect(rows.map((r) => r.name)).toEqual(["上郷", "鼎", "伊賀良", "中心市街地"]);
  });
});

describe("公開の範囲（F-09・7.3）", () => {
  it("anon には公開済みの出典だけが見え、未公開の出典のデータは見えない", async () => {
    const insertFacilities = `insert into facilities (kind, name, source_id, source_key) values
      ('school', '公開の学校', 'published_src', 'a'), ('school', '確認中の学校', 'draft_src', 'b')`;
    const facilities = await run<{ name: string }>("anon", insertFacilities, "select name from facilities");
    expect(facilities.map((r) => r.name)).toEqual(["公開の学校"]);

    const sources = await run<{ id: string }>("anon", "select id from data_sources");
    expect(sources.map((r) => r.id)).toEqual(["published_src"]);
  });

  it("公開フラグの立っていない行事・支援制度は anon に見えない", async () => {
    const events = await run(
      "anon",
      `insert into district_events (district_id, name, season, timing_note, scope, source_note, checked_on)
       values ('kanae', '下書きの行事', '秋', '例年10月ごろ', '地区全体', 'テスト', '2026-10-22')`,
      "select * from district_events",
    );
    expect(events).toEqual([]);

    const programs = await run(
      "anon",
      `insert into support_programs (name, summary, category, official_url, checked_on)
       values ('下書きの制度', 'x', '移住', 'https://example.com', '2026-10-22')`,
      "select * from support_programs",
    );
    expect(programs).toEqual([]);
  });

  it("公開したひな形の文だけが anon に見える", async () => {
    const rows = await run<{ title: string }>(
      "anon",
      `insert into scene_templates (season, title, reviewed_on, is_published) values
         ('春', '公開', '2026-10-22', true), ('夏', '下書き', null, false)`,
      `insert into scene_sentences (template_id, position, kind, body)
         select id, 1, 'データ', '{地区名}には{件数}か所あります。' from scene_templates`,
      "select t.title from scene_sentences s join scene_templates t on t.id = s.template_id",
    );
    expect(rows.map((r) => r.title)).toEqual(["公開"]);
  });
});

describe("入力の制約", () => {
  const event = (district: string, area: string | null) =>
    `insert into district_events (district_id, chushin_area, name, season, timing_note, scope, source_note, checked_on)
     values ('${district}', ${area ? `'${area}'` : "null"}, '東野区民運動会', '秋', '例年10月ごろ', '地区全体', '飯田市公民館活動記録（令和2年度）', '2026-10-22')
     returning participation, art`;

  it("中心市街地の行事は元の地区名が必要で、ほかの地区では持てない", async () => {
    await expect(run("postgres", event("chushin", null))).rejects.toThrow(/district_events_chushin_area_required/);
    await expect(run("postgres", event("kanae", "東野"))).rejects.toThrow(/district_events_chushin_area_required/);
    expect(await run("postgres", event("chushin", "東野"))).toEqual([{ participation: "未確認", art: "その他" }]);
  });

  it.each(["朝7時に出かけます。", "朝７時に出かけます。", "{地区名}を歩きます。"])(
    "想定の文に数字・差し込み部分は入れられない：%s",
    async (body) => {
      await expect(
        run(
          "postgres",
          "insert into scene_templates (season, title) values ('冬', 't')",
          `insert into scene_sentences (template_id, position, kind, body)
           select id, 1, '想定', '${body}' from scene_templates`,
        ),
      ).rejects.toThrow(/scene_sentences_assumption_plain/);
    },
  );

  it("同じ条件のひな形は1つしか作れない（条件の空欄どうしも同じとみなす）", async () => {
    await expect(
      run("postgres", "insert into scene_templates (season, title) values ('春', 'a'), ('春', 'b')"),
    ).rejects.toThrow(/scene_templates_condition_unique/);
  });

  it("確認日のないひな形は公開できない", async () => {
    await expect(
      run("postgres", "insert into scene_templates (season, title, is_published) values ('春', 'a', true)"),
    ).rejects.toThrow(/scene_templates_review_before_publish/);
  });

  it("相場は件数0なら値を持たず、件数があれば値を持つ（該当なしの区別）", async () => {
    const insert = (count: number, median: string) =>
      `insert into market_stats (district_id, category, period_from, period_to, sample_count, median_value, source_id)
       values ('kanae', 'land', '2021Q1', '2026Q1', ${count}, ${median}, 'published_src')`;
    await expect(run("postgres", insert(0, "24000"))).rejects.toThrow(/market_stats_value_iff_samples/);
    await expect(run("postgres", insert(96, "null"))).rejects.toThrow(/market_stats_value_iff_samples/);
    await expect(run("postgres", insert(96, "24000"))).resolves.toEqual([]);
  });

  it("対象期間は 2021Q1 の形で持つ", async () => {
    await expect(
      run(
        "postgres",
        `insert into market_stats (district_id, category, period_from, period_to, sample_count, source_id)
         values ('kanae', 'land', '2021-1', '2026Q1', 0, 'published_src')`,
      ),
    ).rejects.toThrow(/market_stats_period_from_check/);
  });

  it("取得の記録は、終わったら終了日時が必要", async () => {
    await expect(
      run("postgres", "insert into ingest_runs (job, status) values ('transactions', 'succeeded')"),
    ).rejects.toThrow(/ingest_runs_finished_iff_done/);
  });

  it("取得の記録を終えると、終了日時をデータベースの時計で付ける（Worker が送った値は使わない）", async () => {
    const rows = await run<{ status: string; ordered: boolean }>(
      "service_role",
      "insert into ingest_runs (job, started_at) values ('heartbeat', now() - interval '1 minute')",
      `update ingest_runs set status = 'succeeded', finished_at = '2000-01-01T00:00:00Z'
       where job = 'heartbeat' returning status, finished_at >= started_at as ordered`,
    );
    expect(rows).toEqual([{ status: "succeeded", ordered: true }]);
  });

  it("更新すると updated_at が新しくなる", async () => {
    const rows = await run<{ touched: boolean }>(
      "service_role",
      "update districts set created_at = now() - interval '1 day', updated_at = now() - interval '1 day'",
      "update districts set area_description = area_description where id = 'kanae' returning updated_at > created_at as touched",
    );
    expect(rows).toEqual([{ touched: true }]);
  });
});

describe("町名→地区の対応表（004）", () => {
  const latestTownMapSql = () => {
    const file = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith("_town_district_map.sql")).sort().at(-1)!;
    return readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  };

  it("CSV の90町名が入り、4地区それぞれに町名がある", async () => {
    const rows = await run<{ district_id: string | null; count: number }>(
      "anon",
      "select district_id, count(*)::int as count from town_district_map group by district_id order by district_id",
    );
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(90);
    expect(rows.map((r) => r.district_id)).toEqual(["chushin", "igara", "kamisato", "kanae", null]);
  });

  it("対応表にない町名は1行にまとめて回数を足し、空の町名は無視する。反映済みでもまた出たら未反映に戻す", async () => {
    const rows = await run<{ town_name: string; occurrences: number; resolved: boolean }>(
      "service_role",
      "select public.record_unmapped_towns('published_src', array['南信濃須沢', '南信濃須沢', '', ' '])",
      "update unmapped_towns set resolved_at = now()",
      "select public.record_unmapped_towns('published_src', array[' 南信濃須沢'])",
      "select town_name, occurrences, resolved_at is not null as resolved from unmapped_towns",
    );
    expect(rows).toEqual([{ town_name: "南信濃須沢", occurrences: 3, resolved: false }]);
  });

  it("anon・authenticated は対応表にない町名を記録できない", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await expect(
        run(role, "select public.record_unmapped_towns('published_src', array['x'])"),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("対応表を当て直すと、CSV にない町名を消し、対応表の町名で始まる記録を反映済みにする", async () => {
    await db.exec("begin");
    try {
      await db.exec(`
        insert into town_district_map (town_name, city_district, certainty) values ('架空町', '架空', '確実');
        insert into unmapped_towns (town_name, source_id) values ('鼎中平', 'published_src'), ('南信濃須沢', 'published_src');
      `);
      await db.exec(latestTownMapSql());
      const extra = await db.query("select 1 from town_district_map where town_name = '架空町'");
      const unmapped = await db.query<{ town_name: string; resolved: boolean }>(
        "select town_name, resolved_at is not null as resolved from unmapped_towns order by town_name",
      );
      expect(extra.rows).toEqual([]);
      expect(unmapped.rows).toEqual([
        { town_name: "南信濃須沢", resolved: false },
        { town_name: "鼎中平", resolved: true },
      ]);
    } finally {
      await db.exec("rollback");
    }
  });
});
