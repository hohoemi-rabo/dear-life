// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseScreenData } from "../lib/data/screen-data";

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
  "bus_outings",
  "train_departures",
  "train_outings",
];
const PRIVATE_TABLES = ["ingest_runs", "unmapped_towns", "real_estate_transactions", "gtfs_feeds"];

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

  it("CSV の96町名が入り、4地区それぞれに町名がある", async () => {
    const rows = await run<{ district_id: string | null; count: number }>(
      "anon",
      "select district_id, count(*)::int as count from town_district_map group by district_id order by district_id",
    );
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(96);
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

describe("不動産取引の取り込み（006）", () => {
  const row = (year: number, quarter: number, town = "鼎") => ({
    trade_year: year,
    trade_quarter: quarter,
    price_category: "不動産取引価格情報",
    property_type: "宅地(土地)",
    town_name: town,
    district_code: "202050190",
    district_id: "kanae",
    trade_price: 5000000,
    unit_price_per_sqm: 24000,
    area_sqm: 200,
    building_year: null,
    use: null,
    circumstances: null,
    is_excluded: false,
    raw: { DistrictName: town },
  });
  const replace = (year: number, rows: unknown[]) =>
    `select public.replace_real_estate_transactions(${year}::smallint, '${JSON.stringify(rows)}'::jsonb) as inserted`;

  it("年ごとに消して入れ直すので、同じ年を2回取り込んでも二重にならない。ほかの年は残す", async () => {
    const rows = await run<{ trade_year: number; trade_quarter: number; row_count: number }>(
      "service_role",
      replace(2025, [row(2025, 4)]),
      replace(2026, [row(2026, 1), row(2026, 1, "大瀬木")]),
      replace(2026, [row(2026, 1), row(2026, 2)]),
      "select * from public.real_estate_transaction_quarters()",
    );
    expect(rows).toEqual([
      { trade_year: 2025, trade_quarter: 4, row_count: 1 },
      { trade_year: 2026, trade_quarter: 1, row_count: 1 },
      { trade_year: 2026, trade_quarter: 2, row_count: 1 },
    ]);
  });

  it("入れた件数を返す", async () => {
    const rows = await run<{ inserted: number }>("service_role", replace(2026, [row(2026, 1), row(2026, 2)]));
    expect(rows).toEqual([{ inserted: 2 }]);
  });

  it("別の年の行が混ざっていたら、消さずに失敗する", async () => {
    await expect(run("service_role", replace(2026, [row(2026, 1), row(2025, 4)]))).rejects.toThrow(
      /2026 年以外の取引が含まれている/,
    );
  });

  it("anon・authenticated は取り込みの関数を呼べない", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await expect(run(role, replace(2026, []))).rejects.toThrow(/permission denied/);
      await expect(run(role, "select * from public.real_estate_transaction_quarters()")).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  it("出典にクレジットが入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ credit_text: string; is_published: boolean }>(
      "postgres",
      "select credit_text, is_published from data_sources where id = 'reinfolib_xit001'",
    );
    expect(rows).toEqual([
      {
        credit_text:
          "このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません",
        is_published: false,
      },
    ]);
  });
});

describe("相場の集計（007）", () => {
  type Trade = {
    year?: number;
    quarter?: number;
    type?: string;
    district?: string | null;
    price?: number;
    unitPrice?: number | null;
    area?: number | null;
    builtIn?: number | null;
    use?: string | null;
    excluded?: boolean;
  };
  const insertTrades = (trades: Trade[]) =>
    `insert into real_estate_transactions (
       trade_year, trade_quarter, price_category, property_type, town_name, district_id,
       trade_price, unit_price_per_sqm, area_sqm, building_year, use, is_excluded, raw
     ) values ${trades
       .map((t) => {
         const sql = (v: string | number | null | undefined) =>
           v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${v}'`;
         return `(${t.year ?? 2025}, ${t.quarter ?? 1}, '不動産取引価格情報', ${sql(t.type ?? "宅地(土地)")}, '鼎',
           ${sql(t.district === undefined ? "kanae" : t.district)}, ${t.price ?? 5000000}, ${sql(t.unitPrice)},
           ${sql(t.area === undefined ? 200 : t.area)}, ${sql(t.builtIn)}, ${sql(t.use)}, ${t.excluded ?? false}, '{}')`;
       })
       .join(", ")}`;
  const refresh = (from = "2021Q1", to = "2026Q1") => `select public.refresh_market_stats('${from}', '${to}') as written`;
  type Stat = {
    district_id: string;
    category: string;
    period_from: string;
    period_to: string;
    sample_count: number;
    median_value: string | null;
    p25_value: string | null;
    p75_value: string | null;
  };
  const stats = (district = "kanae") =>
    `select district_id, category::text, period_from, period_to, sample_count, median_value::text, p25_value::text, p75_value::text
     from market_stats where district_id = '${district}' order by market_stats.category`;

  it("土地は㎡単価の真ん中の値と25%・75%を線形補間で出し、㎡単価が空なら総額÷面積で補う", async () => {
    const rows = await run<Stat>(
      "service_role",
      insertTrades([
        { unitPrice: 10000 },
        { unitPrice: 20000 },
        { unitPrice: 30000 },
        { unitPrice: null, price: 8000000, area: 200 }, // 40,000円/㎡
      ]),
      refresh(),
      stats(),
    );
    expect(rows.find((r) => r.category === "land")).toEqual({
      district_id: "kanae",
      category: "land",
      period_from: "2021Q1",
      period_to: "2026Q1",
      sample_count: 4,
      median_value: "25000",
      p25_value: "17500",
      p75_value: "32500",
    });
  });

  it("中古戸建ては築20年以内と築21年以上に分けて総額の真ん中の値を出す。幅は出さない", async () => {
    const house = (price: number, builtIn: number | null, use: string | null = "住宅") =>
      ({ type: "宅地(土地と建物)", year: 2025, price, builtIn, use }) satisfies Trade;
    const rows = await run<Stat>(
      "service_role",
      insertTrades([
        house(30000000, 2005), // 築20年 → 以内
        house(20000000, 2010, null), // 用途が空 → 住宅に含める
        house(9000000, 2004), // 築21年 → 以上
        house(5000000, null), // 建築年不明 → どちらにも入れない
        house(70000000, 2020, "事務所"), // 住宅でない
        house(40000000, 2015, "住宅、店舗"), // 住宅を含む
      ]),
      refresh(),
      stats(),
    );
    expect(rows.filter((r) => r.category !== "land")).toEqual([
      expect.objectContaining({ category: "house_built_within_20y", sample_count: 3, median_value: "30000000", p25_value: null, p75_value: null }),
      expect.objectContaining({ category: "house_built_over_20y", sample_count: 1, median_value: "9000000", p25_value: null, p75_value: null }),
    ]);
  });

  it("除外する取引・地区のない取引・期間の外の取引は数えない。期間は両端の四半期を含む", async () => {
    const rows = await run<Stat>(
      "service_role",
      insertTrades([
        { year: 2021, quarter: 1, unitPrice: 10000 },
        { year: 2026, quarter: 1, unitPrice: 20000 },
        { year: 2020, quarter: 4, unitPrice: 99000 },
        { year: 2026, quarter: 2, unitPrice: 99000 },
        { unitPrice: 99000, excluded: true },
        { unitPrice: 99000, district: null },
      ]),
      refresh("2021Q1", "2026Q1"),
      stats(),
    );
    expect(rows.find((r) => r.category === "land")).toMatchObject({ sample_count: 2, median_value: "15000" });
  });

  it("4地区×3種類の行を必ず作り、取引がなければ件数0・値なし（該当なし）にする", async () => {
    const rows = await run<Stat & { written: number }>(
      "service_role",
      insertTrades([{ unitPrice: 10000 }]),
      refresh(),
      `select district_id, category::text, sample_count, median_value::text from market_stats order by district_id, category`,
    );
    expect(rows).toHaveLength(12);
    expect(rows.filter((r) => r.sample_count > 0)).toEqual([
      { district_id: "kanae", category: "land", sample_count: 1, median_value: "10000" },
    ]);
    expect(rows.filter((r) => r.sample_count === 0).every((r) => r.median_value === null)).toBe(true);
  });

  it("集計し直すと前の値を上書きし、書いた行数を返す", async () => {
    const rows = await run<{ written: number; sample_count: number; period_from: string }>(
      "service_role",
      insertTrades([{ year: 2021, quarter: 1, unitPrice: 10000 }, { year: 2026, quarter: 2, unitPrice: 20000 }]),
      refresh("2021Q1", "2026Q1"),
      refresh("2021Q2", "2026Q2"),
      `select (select count(*)::int from market_stats) as written, sample_count, period_from
       from market_stats where district_id = 'kanae' and category = 'land'`,
    );
    expect(rows).toEqual([{ written: 12, sample_count: 1, period_from: "2021Q2" }]);
    expect(await run("service_role", refresh())).toEqual([{ written: 12 }]);
  });

  it("期間の形が違う・始まりが終わりより後なら失敗する", async () => {
    await expect(run("service_role", refresh("2021-1", "2026Q1"))).rejects.toThrow(/2021Q1 の形で渡す/);
    await expect(run("service_role", refresh("2026Q2", "2026Q1"))).rejects.toThrow(/終わり（2026Q1）より後/);
  });

  it("anon・authenticated は集計の関数を呼べない", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await expect(run(role, refresh())).rejects.toThrow(/permission denied/);
    }
  });
});

describe("バス（010）", () => {
  const latestBusSql = () => {
    const file = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith("_bus_gtfs_data.sql"))
      .sort()
      .at(-1);
    if (!file) throw new Error("*_bus_gtfs_data.sql がない");
    return readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  };
  const counts = `
    select
      (select count(*)::int from facilities where kind = 'bus_stop') as stops,
      (select count(*)::int from bus_outings) as outings,
      (select count(*)::int from gtfs_feeds) as feeds`;

  it("4地区それぞれにバス停と、並び順1のおでかけがある", async () => {
    const rows = await run<{ district_id: string; stops: number; first_outing: number }>(
      "postgres",
      `select d.id as district_id,
         (select count(*)::int from facilities f where f.kind = 'bus_stop' and f.district_id = d.id) as stops,
         (select count(*)::int from bus_outings o where o.district_id = d.id and o.sort_order = 1) as first_outing
       from districts d order by d.sort_order`,
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.stops, row.district_id).toBeGreaterThan(0);
      expect(row.first_outing, row.district_id).toBe(1);
    }
  });

  it("取り込みの SQL を当て直しても、行が二重にならない", async () => {
    await db.exec("begin");
    try {
      const before = (await db.query(counts)).rows;
      await db.exec(latestBusSql());
      expect((await db.query(counts)).rows).toEqual(before);
    } finally {
      await db.exec("rollback");
    }
  });

  it("出典を公開するまで、anon にはバス停もおでかけも見えない。公開すると見える", async () => {
    expect(await run("anon", "select 1 from bus_outings")).toEqual([]);
    expect(await run("anon", "select 1 from facilities where kind = 'bus_stop'")).toEqual([]);
    const published = await run<{ outings: number }>(
      "anon",
      "update data_sources set is_published = true where id = 'gtfs_minamishinshu_bus'",
      "select count(*)::int as outings from bus_outings",
    );
    expect(published[0].outings).toBeGreaterThan(0);
  });

  it("出典にクレジットと期間が入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ license: string; credit_text: string; period_label: string; is_published: boolean }>(
      "postgres",
      "select license, credit_text, period_label, is_published from data_sources where id = 'gtfs_minamishinshu_bus'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].license).toBe("CC BY 4.0");
    expect(rows[0].credit_text).toMatch(/^出典：南信州地域交通問題協議会「.+」（GTFSデータリポジトリ）。CC BY 4.0/);
    expect(rows[0].period_label).toMatch(/まで有効なダイヤ$/);
    expect(rows[0].is_published).toBe(false);
  });

  it("便の有無と状態が食い違う行は入れられない", async () => {
    const insert = (status: string, returnColumns: string) => `
      insert into bus_outings (
        district_id, sort_order, day_type, service_date, origin_stop_name, destination_stop_name, depart_after, return_after, status,
        outbound_departure, outbound_arrival, outbound_route_name, return_departure, return_arrival, return_route_name,
        outbound_trips_per_day, return_trips_per_day, origin_departures_per_day, valid_until, source_id
      ) values (
        'kanae', 99, '土曜', '2027-01-16', 'A', 'B', '09:00', '12:00', '${status}',
        '09:30', '09:50', 'R', ${returnColumns}, 1, 1, 1, '2027-03-31', 'gtfs_minamishinshu_bus'
      )`;
    await expect(run("service_role", insert("available", "null, null, null"))).rejects.toThrow(/bus_outings_trips_match_status/);
    await expect(run("service_role", insert("no_return", "'13:00', '13:20', 'R'"))).rejects.toThrow(/bus_outings_trips_match_status/);
    await expect(run("service_role", insert("available", "'13:00', '13:20', 'R'"))).resolves.toEqual([]);
  });
});

describe("電車（026）", () => {
  it("駅のある3地区に並び順1の電車のおでかけがあり、伊賀良にはない", async () => {
    const rows = await run<{ district_id: string; outings: number }>(
      "postgres",
      `select d.id as district_id, (select count(*)::int from train_outings o where o.district_id = d.id and o.sort_order = 1) as outings
       from districts d order by d.sort_order`,
    );
    expect(Object.fromEntries(rows.map((row) => [row.district_id, row.outings]))).toEqual({ kamisato: 1, kanae: 1, igara: 0, chushin: 1 });
  });

  it("電車のおでかけは、便の有無と状態が食い違う行を入れられない", async () => {
    const insert = (status: string, returnColumns: string) => `
      insert into train_outings (
        district_id, sort_order, origin_station_name, destination_station_name, depart_after, return_after, status,
        outbound_departure, outbound_arrival, outbound_train_type, return_departure, return_arrival, return_train_type,
        outbound_trips_per_day, return_trips_per_day, origin_departures_per_day, source_id
      ) values (
        'kanae', 99, '鼎', '飯田', '09:00', '12:00', '${status}',
        '09:00', '09:08', '普通', ${returnColumns}, 1, 1, 1, 'iida_jr_timetable'
      )`;
    await expect(run("service_role", insert("available", "null, null, null"))).rejects.toThrow(/train_outings_trips_match_status/);
    await expect(run("service_role", insert("no_return", "'12:19', '12:25', '普通'"))).rejects.toThrow(/train_outings_trips_match_status/);
    await expect(run("service_role", insert("available", "'12:19', '12:25', '普通'"))).resolves.toEqual([]);
  });

  it("4地区の駅と発車時刻が入り、伊賀良には駅がない（地区内の駅だけ）", async () => {
    const rows = await run<{ district_id: string; stations: number; departures: number }>(
      "postgres",
      `select d.id as district_id,
         (select count(*)::int from facilities f where f.kind = 'train_station' and f.district_id = d.id) as stations,
         (select count(*)::int from train_departures t where t.district_id = d.id) as departures
       from districts d order by d.sort_order`,
    );
    const byDistrict = Object.fromEntries(rows.map((row) => [row.district_id, row]));
    for (const id of ["kamisato", "kanae", "chushin"]) {
      expect(byDistrict[id].stations, id).toBeGreaterThan(0);
      expect(byDistrict[id].departures, id).toBeGreaterThan(0);
    }
    expect(byDistrict.igara).toMatchObject({ stations: 0, departures: 0 });
  });

  it("発車時刻の駅は、すべて駅の表にある", async () => {
    const rows = await run(
      "postgres",
      `select distinct t.station_name from train_departures t
       where not exists (select 1 from facilities f where f.kind = 'train_station' and f.name = t.station_name and f.district_id = t.district_id)`,
    );
    expect(rows).toEqual([]);
  });

  it("出典を公開するまで、anon には駅も時刻も見えない。駅と時刻は別々に公開できる", async () => {
    expect(await run("anon", "select 1 from train_departures")).toEqual([]);
    expect(await run("anon", "select 1 from train_outings")).toEqual([]);
    expect(await run("anon", "select 1 from facilities where kind = 'train_station'")).toEqual([]);
    const stationsOnly = await run<{ stations: number; departures: number }>(
      "anon",
      "update data_sources set is_published = true where id = 'sena_iida_line_stations'",
      `select (select count(*)::int from facilities where kind = 'train_station') as stations,
              (select count(*)::int from train_departures) as departures`,
    );
    expect(stationsOnly[0].stations).toBeGreaterThan(0);
    expect(stationsOnly[0].departures).toBe(0);
  });

  it("出典にクレジットが入り、時刻は許可を取るまで未公開・ライセンス未記入にしておく", async () => {
    const rows = await run<{ id: string; license: string | null; credit_text: string; period_label: string | null; is_published: boolean }>(
      "postgres",
      "select id, license, credit_text, period_label, is_published from data_sources where id in ('sena_iida_line_stations', 'iida_jr_timetable') order by id",
    );
    expect(rows).toHaveLength(2);
    const [timetable, stations] = rows;
    expect(stations.license).toBe("CC BY 2.1 JP");
    expect(stations.credit_text).toMatch(/^出典：三遠南信地域連携ビジョン推進会議（SENA）「JR飯田線の駅\.csv」/);
    expect(timetable.license).toBeNull();
    expect(timetable.credit_text).toMatch(/^出典：飯田市「公共交通総合案内」JR飯田線 時刻表/);
    expect(timetable.period_label).toMatch(/改正のダイヤ$/);
    expect(rows.every((row) => !row.is_published)).toBe(true);
  });

  it("取り込みの SQL を当て直しても、行が二重にならない", async () => {
    const file = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith("_train_data.sql")).sort().at(-1);
    if (!file) throw new Error("*_train_data.sql がない");
    const counts = `select (select count(*)::int from facilities where kind = 'train_station') as stations,
                           (select count(*)::int from train_departures) as departures,
                           (select count(*)::int from train_outings) as outings`;
    await db.exec("begin");
    try {
      const before = (await db.query(counts)).rows;
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      expect((await db.query(counts)).rows).toEqual(before);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("学区・学校・保育施設（008）", () => {
  // 4地区に1校ずつある学校。学校コードは学区の API の学校コードと同じ
  const SCHOOLS = [
    { code: "B1", district: "kamisato", name: "上郷小学校" },
    { code: "B2", district: "kanae", name: "鼎小学校" },
    { code: "B3", district: "igara", name: "伊賀良小学校" },
    { code: "B4", district: "chushin", name: "丸山小学校" },
  ];
  const facility = (code: string, district: string, name: string) => ({
    kind: "school",
    subkind: "小学校",
    name: `飯田市立${name}`,
    address: "長野県飯田市",
    town_name: "町",
    district_id: district,
    latitude: 35.5,
    longitude: 137.8,
    source_key: code,
    attributes: { school_code: code },
  });
  const replaceFacilities = (sourceId: string, rows: unknown[]) =>
    `select public.replace_facilities('${sourceId}', '${JSON.stringify(rows)}'::jsonb) as inserted`;
  // 学区の地区は、教育機関一覧（iida_education）の学校から決める
  const putSchools = replaceFacilities(
    "iida_education",
    SCHOOLS.map((s) => facility(s.code, s.district, s.name)),
  );

  // 経度 lon・緯度 lat を左下にした 0.01 度四方の Polygon（タイルの切れ端の代わり）
  const square = (lon: number, lat: number) => ({
    type: "Polygon",
    coordinates: [[[lon, lat], [lon + 0.01, lat], [lon + 0.01, lat + 0.01], [lon, lat + 0.01], [lon, lat]]],
  });
  const piece = (code: string, name: string, geometry: unknown) => ({
    type: "Feature",
    geometry,
    properties: { A27_003: code, A27_004_ja: name, A27_005: "飯田市" },
  });
  const BOUNDS = { west: 137.6, south: 35.3, east: 138.0, north: 35.8 };
  // 上郷小の学区は2つのタイルにまたがり、松尾小（4地区の外。学校の点がない）も入っている
  const TILES = [
    {
      type: "FeatureCollection",
      features: [
        piece("B1", "上郷小学校", square(137.84, 35.51)),
        piece("B2", "鼎小学校", square(137.82, 35.5)),
        piece("B9", "松尾小学校", square(137.83, 35.48)),
      ],
    },
    {
      type: "FeatureCollection",
      features: [
        piece("B1", "上郷小学校", { type: "MultiPolygon", coordinates: [square(137.85, 35.51).coordinates, square(137.85, 35.52).coordinates] }),
        piece("B3", "伊賀良小学校", square(137.79, 35.49)),
        piece("B4", "丸山小学校", square(137.81, 35.52)),
      ],
    },
  ];
  const replaceDistricts = (tiles: unknown[], bounds: unknown = BOUNDS) =>
    `select public.replace_school_districts('elementary', 'reinfolib_xkt004', '${JSON.stringify(tiles)}'::jsonb, '${JSON.stringify(bounds)}'::jsonb) as inserted`;

  it("施設は出典ごとに消して入れ直し、ほかの出典（バス停など）は残す。入れた件数を返す", async () => {
    const rows = await run<{ source_id: string; count: number }>(
      "service_role",
      replaceFacilities("reinfolib_xkt006", SCHOOLS.map((s) => facility(s.code, s.district, s.name))),
      replaceFacilities("reinfolib_xkt006", [facility("B1", "kamisato", "上郷小学校")]),
      "select source_id, count(*)::int from facilities where source_id in ('reinfolib_xkt006', 'gtfs_minamishinshu_bus') group by source_id order by source_id",
    );
    expect(rows).toEqual([
      { source_id: "gtfs_minamishinshu_bus", count: expect.any(Number) },
      { source_id: "reinfolib_xkt006", count: 1 },
    ]);
    expect(await run("service_role", putSchools)).toEqual([{ inserted: 4 }]);
  });

  it("施設が0件なら、消さずに失敗する", async () => {
    await expect(run("service_role", replaceFacilities("reinfolib_xkt006", []))).rejects.toThrow(/0件なので、入れ直さない/);
  });

  it("学区は学校ごとにタイルの切れ端を1つの MultiPolygon にまとめ、学校のある地区を付ける。4地区の外の学校の学区は地区なしで入れる", async () => {
    const rows = await run<{ source_key: string; school_name: string; district_id: string | null; polygons: number; type: string }>(
      "service_role",
      putSchools,
      replaceDistricts(TILES),
      replaceDistricts(TILES),
      `select source_key, school_name, district_id, jsonb_array_length(geometry -> 'coordinates') as polygons, geometry ->> 'type' as type
       from school_districts order by source_key`,
    );
    expect(rows).toEqual([
      { source_key: "B1", school_name: "上郷小学校", district_id: "kamisato", polygons: 3, type: "MultiPolygon" },
      { source_key: "B2", school_name: "鼎小学校", district_id: "kanae", polygons: 1, type: "MultiPolygon" },
      { source_key: "B3", school_name: "伊賀良小学校", district_id: "igara", polygons: 1, type: "MultiPolygon" },
      { source_key: "B4", school_name: "丸山小学校", district_id: "chushin", polygons: 1, type: "MultiPolygon" },
      { source_key: "B9", school_name: "松尾小学校", district_id: null, polygons: 1, type: "MultiPolygon" },
    ]);
    expect(await run("service_role", putSchools, replaceDistricts(TILES))).toEqual([{ inserted: 5 }]);
  });

  it("学区のない地区があれば、入れずに失敗する", async () => {
    const withoutIgara = TILES.map((tile) => ({
      ...tile,
      features: tile.features.filter((f) => f.properties.A27_003 !== "B3"),
    }));
    await expect(run("service_role", putSchools, replaceDistricts(withoutIgara))).rejects.toThrow(/学区のない地区がある：伊賀良/);
  });

  it("学区が取ったタイルの端まで届いていたら（範囲の外で切れている）、入れずに失敗する", async () => {
    await expect(
      run("service_role", putSchools, replaceDistricts(TILES, { ...BOUNDS, east: 137.8605 })),
    ).rejects.toThrow(/端まで届いている学区がある.*上郷小学校/);
  });

  it("学区が1つもない・面でない形があるときは、入れずに失敗する", async () => {
    await expect(run("service_role", putSchools, replaceDistricts([{ type: "FeatureCollection", features: [] }]))).rejects.toThrow(/学区が1つもない/);
    const withPoint = [{ type: "FeatureCollection", features: [piece("B1", "上郷小学校", { type: "Point", coordinates: [137.8, 35.5] })] }];
    await expect(run("service_role", putSchools, replaceDistricts(withPoint))).rejects.toThrow(/Polygon・MultiPolygon 以外/);
  });

  it("anon・authenticated は取り込みの関数を呼べない", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await expect(run(role, putSchools)).rejects.toThrow(/permission denied/);
      await expect(run(role, replaceDistricts(TILES))).rejects.toThrow(/permission denied/);
    }
  });

  it("国の4つの出典にクレジットと対象年度が入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ id: string; credit_text: string; period_label: string; is_published: boolean }>(
      "postgres",
      "select id, credit_text, period_label, is_published from data_sources where id like 'reinfolib_xkt%' order by id",
    );
    expect(rows.map((row) => row.id)).toEqual(["reinfolib_xkt004", "reinfolib_xkt005", "reinfolib_xkt006", "reinfolib_xkt007"]);
    for (const row of rows) {
      expect(row.credit_text).toMatch(/^このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが/);
      expect(row.period_label).toBe("令和5年度");
      expect(row.is_published).toBe(false);
    }
  });
});

describe("市の子育て施設（009）", () => {
  it("4地区それぞれに保育施設と放課後児童クラブがあり、放課後児童クラブは別の種類になっている。4地区の外の施設も地区なしで入っている", async () => {
    const rows = await run<{ district_id: string; childcare: number; clubs: number }>(
      "postgres",
      `select d.id as district_id,
         (select count(*)::int from facilities f where f.source_id = 'iida_childcare' and f.district_id = d.id and f.kind = 'childcare') as childcare,
         (select count(*)::int from facilities f where f.source_id = 'iida_childcare' and f.district_id = d.id and f.kind = 'after_school_club') as clubs
       from districts d order by d.sort_order`,
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.childcare, row.district_id).toBeGreaterThan(0);
      expect(row.clubs, row.district_id).toBeGreaterThan(0);
    }
    const subkinds = await run<{ subkind: string }>(
      "postgres",
      "select distinct subkind from facilities where source_id = 'iida_childcare' and kind = 'after_school_club'",
    );
    expect(subkinds).toEqual([{ subkind: "放課後児童クラブ" }]);
    const outside = await run<{ n: number }>("postgres", "select count(*)::int as n from facilities where source_id = 'iida_childcare' and district_id is null");
    expect(outside[0].n).toBeGreaterThan(0);
  });

  it("取り込みの SQL を当て直しても、行が二重にならない", async () => {
    const file = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith("_childcare_data.sql")).sort().at(-1);
    if (!file) throw new Error("*_childcare_data.sql がない");
    const count = "select count(*)::int as n from facilities where source_id = 'iida_childcare'";
    await db.exec("begin");
    try {
      const before = (await db.query(count)).rows;
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      expect((await db.query(count)).rows).toEqual(before);
    } finally {
      await db.exec("rollback");
    }
  });

  it("出典に市の記載例どおりのクレジットと更新日が入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ license: string; credit_text: string; period_label: string; checked_on: string | null; is_published: boolean }>(
      "postgres",
      "select license, credit_text, period_label, checked_on::text, is_published from data_sources where id = 'iida_childcare'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].license).toBe("PDL1.0");
    expect(rows[0].credit_text).toMatch(/^出典：飯田市（https:\/\/www\.city\.iida\.lg\.jp\/soshiki\/168\/opendata\.html）、PDL1\.0（.+）（\d{4}年\d{1,2}月\d{1,2}日に利用）。「子育て施設」（飯田市）/);
    expect(rows[0].period_label).toMatch(/更新$/);
    expect(rows[0].checked_on).not.toBeNull();
    expect(rows[0].is_published).toBe(false);
  });
});

describe("市の教育機関一覧（009・008）", () => {
  it("4地区それぞれに小学校と中学校があり、4地区の外の学校も地区なしで入っている。こども園は入れない", async () => {
    const rows = await run<{ district_id: string; elementary: number; junior_high: number }>(
      "postgres",
      `select d.id as district_id,
         (select count(*)::int from facilities f where f.source_id = 'iida_education' and f.district_id = d.id and f.subkind = '小学校') as elementary,
         (select count(*)::int from facilities f where f.source_id = 'iida_education' and f.district_id = d.id and f.subkind = '中学校') as junior_high
       from districts d order by d.sort_order`,
    );
    for (const row of rows) {
      expect(row.elementary, row.district_id).toBeGreaterThan(0);
      expect(row.junior_high, row.district_id).toBeGreaterThan(0);
    }
    const others = await run<{ outside: number; kindergartens: number }>(
      "postgres",
      `select (select count(*)::int from facilities where source_id = 'iida_education' and district_id is null) as outside,
              (select count(*)::int from facilities where source_id = 'iida_education' and (kind <> 'school' or subkind like '%こども園%')) as kindergartens`,
    );
    expect(others[0].outside).toBeGreaterThan(0);
    expect(others[0].kindergartens).toBe(0);
  });

  it("取り込みの SQL を当て直しても、行が二重にならない", async () => {
    const file = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith("_education_data.sql")).sort().at(-1);
    if (!file) throw new Error("*_education_data.sql がない");
    const count = "select count(*)::int as n from facilities where source_id = 'iida_education'";
    await db.exec("begin");
    try {
      const before = (await db.query(count)).rows;
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      expect((await db.query(count)).rows).toEqual(before);
    } finally {
      await db.exec("rollback");
    }
  });

  it("出典に市の記載例どおりのクレジットが入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ license: string; credit_text: string; period_label: string; is_published: boolean }>(
      "postgres",
      "select license, credit_text, period_label, is_published from data_sources where id = 'iida_education'",
    );
    expect(rows).toEqual([
      {
        license: "PDL1.0",
        credit_text: expect.stringMatching(/^出典：飯田市（.+）、PDL1\.0（.+）（\d{4}年\d{1,2}月\d{1,2}日に利用）。「教育機関一覧」（飯田市）/),
        period_label: "更新日の記載なし",
        is_published: false,
      },
    ]);
  });
});

describe("市の指定緊急避難場所一覧（009）", () => {
  it("4地区それぞれに避難場所があり、洪水・土砂災害の避難場所もある。4地区の外の避難場所も地区なしで入っている", async () => {
    const rows = await run<{ district_id: string; sites: number; flood: number; landslide: number }>(
      "postgres",
      `select d.id as district_id,
         count(f.id)::int as sites,
         count(f.id) filter (where f.attributes->'hazards' ? 'flood')::int as flood,
         count(f.id) filter (where f.attributes->'hazards' ? 'landslide')::int as landslide
       from districts d
       left join facilities f on f.district_id = d.id and f.source_id = 'iida_evacuation' and f.kind = 'evacuation_site'
       group by d.id, d.sort_order order by d.sort_order`,
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.sites, row.district_id).toBeGreaterThan(0);
      expect(row.flood, row.district_id).toBeGreaterThan(0);
      expect(row.landslide, row.district_id).toBeGreaterThan(0);
    }
    const outside = await run<{ n: number }>("postgres", "select count(*)::int as n from facilities where source_id = 'iida_evacuation' and district_id is null");
    expect(outside[0].n).toBeGreaterThan(0);
  });

  it("取り込みの SQL を当て直しても、行が二重にならない", async () => {
    const file = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith("_evacuation_data.sql")).sort().at(-1);
    if (!file) throw new Error("*_evacuation_data.sql がない");
    const count = "select count(*)::int as n from facilities where source_id = 'iida_evacuation'";
    await db.exec("begin");
    try {
      const before = (await db.query(count)).rows;
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      expect((await db.query(count)).rows).toEqual(before);
    } finally {
      await db.exec("rollback");
    }
  });

  it("出典に市の記載例どおりのクレジットと更新日が入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ license: string; credit_text: string; period_label: string; checked_on: string | null; is_published: boolean }>(
      "postgres",
      "select license, credit_text, period_label, checked_on::text, is_published from data_sources where id = 'iida_evacuation'",
    );
    expect(rows).toEqual([
      {
        license: "PDL1.0",
        credit_text: expect.stringMatching(/^出典：飯田市（.+）、PDL1\.0（.+）（\d{4}年\d{1,2}月\d{1,2}日に利用）。「指定緊急避難場所一覧」（飯田市）/),
        period_label: expect.stringMatching(/更新$/),
        checked_on: expect.any(String),
        is_published: false,
      },
    ]);
  });
});

describe("市の公共施設一覧（009）", () => {
  it("4地区それぞれに市役所・支所、公民館、図書館があり、市営住宅などの載せない種類は入っていない", async () => {
    const rows = await run<{ district_id: string; offices: number; halls: number; libraries: number }>(
      "postgres",
      `select d.id as district_id,
         (select count(*)::int from facilities f where f.source_id = 'iida_public_facilities' and f.district_id = d.id and f.subkind = '市役所・支所') as offices,
         (select count(*)::int from facilities f where f.source_id = 'iida_public_facilities' and f.district_id = d.id and f.subkind = '公民館') as halls,
         (select count(*)::int from facilities f where f.source_id = 'iida_public_facilities' and f.district_id = d.id and f.subkind = '図書館') as libraries
       from districts d order by d.sort_order`,
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.offices, row.district_id).toBeGreaterThan(0);
      expect(row.halls, row.district_id).toBeGreaterThan(0);
      expect(row.libraries, row.district_id).toBeGreaterThan(0);
    }
    const others = await run<{ excluded: number; kinds: number }>(
      "postgres",
      `select (select count(*)::int from facilities where source_id = 'iida_public_facilities' and name ~ '市営住宅|調理場|給食センター|斎苑|最終処分場|^産業経済部') as excluded,
              (select count(distinct kind)::int from facilities where source_id = 'iida_public_facilities') as kinds`,
    );
    expect(others[0]).toEqual({ excluded: 0, kinds: 1 });
  });

  it("取り込みの SQL を当て直しても、行が二重にならない", async () => {
    const file = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith("_public_facilities_data.sql")).sort().at(-1);
    if (!file) throw new Error("*_public_facilities_data.sql がない");
    const count = "select count(*)::int as n from facilities where source_id = 'iida_public_facilities'";
    await db.exec("begin");
    try {
      const before = (await db.query(count)).rows;
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      expect((await db.query(count)).rows).toEqual(before);
    } finally {
      await db.exec("rollback");
    }
  });

  it("出典に市の記載例どおりのクレジットと更新日が入り、画面に出せるまでは未公開にしておく", async () => {
    const rows = await run<{ license: string; credit_text: string; period_label: string; is_published: boolean }>(
      "postgres",
      "select license, credit_text, period_label, is_published from data_sources where id = 'iida_public_facilities'",
    );
    expect(rows).toEqual([
      {
        license: "PDL1.0",
        credit_text: expect.stringMatching(/^出典：飯田市（.+）、PDL1\.0（.+）（\d{4}年\d{1,2}月\d{1,2}日に利用）。「公共施設一覧」（飯田市）/),
        period_label: "2025年6月23日更新",
        is_published: false,
      },
    ]);
  });
});

describe("画面が読むデータ screen_data（015）", () => {
  type Section = { source_id: string; items: Record<string, unknown>[] };
  type ScreenData = {
    sources: { id: string }[];
    districts: {
      id: string;
      market: Section;
      elementary_school_districts: Section;
      facilities: Record<string, Section>;
      train_departures: Section;
      population: Section;
      bus_outing: Section;
      train_outing: Section;
      events: { season: string; name: string }[];
    }[];
    support_programs: { name: string }[];
    scene_templates: { title: string; sentences: { body: string }[] }[];
  };
  const publish = (...ids: string[]) =>
    `update data_sources set is_published = true where id in (${ids.map((id) => `'${id}'`).join(", ")})`;
  // テスト用に最初に入れた出典（published_src など）は外し、マイグレーションの出典だけで確かめる
  const screenData = async (...setup: string[]) =>
    (
      await run<{ data: ScreenData }>(
        "anon",
        "delete from data_sources where id in ('published_src', 'draft_src')",
        ...setup,
        "select public.screen_data() as data",
      )
    )[0].data;
  const district = (data: ScreenData, id: string) => {
    const found = data.districts.find((d) => d.id === id);
    if (!found) throw new Error(`${id} がない`);
    return found;
  };

  it("anon が実行できる関数は screen_data だけ", async () => {
    const rows = await run<{ proname: string }>(
      "postgres",
      `select proname from pg_proc
       where pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'execute') order by proname`,
    );
    expect(rows.map((r) => r.proname)).toEqual(["screen_data"]);
    await expect(run("authenticated", "select public.screen_data()")).rejects.toThrow(/permission denied/);
  });

  it("出典がすべて未公開なら、4地区の欄は出典の id だけを持ち、中身は空（データ未取得）", async () => {
    const data = await screenData();
    expect(data.sources).toEqual([]);
    expect(data.districts.map((d) => d.id)).toEqual(["kamisato", "kanae", "igara", "chushin"]);
    const kanae = district(data, "kanae");
    expect(kanae.market).toEqual({ source_id: "reinfolib_xit001", items: [] });
    expect(Object.keys(kanae.facilities).sort()).toEqual(
      ["after_school_clubs", "bus_stops", "childcare", "evacuation_sites", "public_facilities", "schools", "train_stations"].sort(),
    );
    expect(Object.values(kanae.facilities).every((s) => s.items.length === 0)).toBe(true);
    expect(kanae.bus_outing).toEqual({ source_id: "gtfs_minamishinshu_bus", items: [] });
  });

  it("公開した出典のデータだけが入る。学校・保育施設は市のデータを出し、国土数値情報は公開しても入れない", async () => {
    const data = await screenData(publish("iida_evacuation", "reinfolib_xkt006", "reinfolib_xkt007"));
    expect(data.sources.map((s) => s.id)).toEqual(["iida_evacuation", "reinfolib_xkt006", "reinfolib_xkt007"]);
    const kanae = district(data, "kanae");
    expect(kanae.facilities.evacuation_sites.source_id).toBe("iida_evacuation");
    expect(kanae.facilities.evacuation_sites.items.length).toBeGreaterThan(0);
    expect(kanae.facilities.evacuation_sites.items[0]).toEqual({
      name: expect.any(String),
      subkind: expect.any(String),
      address: expect.any(String),
      hazards: expect.any(Array),
    });
    expect(kanae.facilities.schools).toEqual({ source_id: "iida_education", items: [] });
    expect(kanae.facilities.childcare).toEqual({ source_id: "iida_childcare", items: [] });
  });

  it("相場・学区・人口・おでかけは、公開すると地区ごとに入る", async () => {
    const data = await screenData(
      publish("reinfolib_xit001", "reinfolib_xkt004", "estat_census_small_area", "gtfs_minamishinshu_bus"),
      `insert into market_stats (district_id, category, period_from, period_to, sample_count, median_value, source_id)
       values ('kanae', 'land', '2021Q1', '2026Q1', 3, 24000, 'reinfolib_xit001'),
              ('kanae', 'house_built_within_20y', '2021Q1', '2026Q1', 0, null, 'reinfolib_xit001')`,
      // 学区は定期取得の Worker が入れるので、マイグレーションには行がない
      `insert into school_districts (level, school_name, geometry, source_id, source_key, district_id)
       values ('elementary', '鼎小学校', '{"type": "MultiPolygon", "coordinates": []}', 'reinfolib_xkt004', 'x', 'kanae')`,
    );
    const kanae = district(data, "kanae");
    expect(kanae.market.items).toEqual([
      expect.objectContaining({ category: "land", sample_count: 3, median_value: 24000 }),
      expect.objectContaining({ category: "house_built_within_20y", sample_count: 0, median_value: null }),
    ]);
    expect(kanae.elementary_school_districts).toEqual({ source_id: "reinfolib_xkt004", items: [{ school_name: "鼎小学校" }] });
    expect(kanae.population.items).toEqual([expect.objectContaining({ as_of: "2020-10-01", total: expect.any(Number) })]);
    expect(kanae.bus_outing.items).toEqual([expect.objectContaining({ origin_name: "鼎公民館前", destination_name: "飯田駅前" })]);
  });

  it("駅の本数は特急を除いて数え、伊賀良は駅も時刻もない（該当なし）", async () => {
    const data = await screenData(publish("iida_jr_timetable", "sena_iida_line_stations"));
    const counts = await run<{ district_id: string; station_name: string; direction: string; n: number; first: string; last: string }>(
      "postgres",
      `select district_id, station_name, direction, count(*)::int as n, min(departure) as first, max(departure) as last
       from train_departures where train_type not like '特急%' group by 1, 2, 3`,
    );
    for (const id of ["kamisato", "kanae", "chushin"]) {
      const expected = counts
        .filter((c) => c.district_id === id)
        .map((c) => ({ station_name: c.station_name, direction: c.direction, trips_per_day: c.n, first_departure: c.first, last_departure: c.last }));
      expect(district(data, id).train_departures.items).toEqual(expect.arrayContaining(expected));
      expect(district(data, id).train_departures.items).toHaveLength(expected.length);
      expect(district(data, id).train_outing.items).toHaveLength(1);
    }
    const igara = district(data, "igara");
    expect(igara.facilities.train_stations).toEqual({ source_id: "sena_iida_line_stations", items: [] });
    expect(igara.train_departures).toEqual({ source_id: "iida_jr_timetable", items: [] });
  });

  it("行事・支援制度・ひな形は公開したものだけが入る", async () => {
    const data = await screenData(
      "update district_events set is_published = false",
      `insert into district_events (district_id, name, season, timing_note, scope, source_note, checked_on, is_published) values
         ('kanae', '公開の行事', '秋', '例年10月ごろ', '地区全体', 'テスト', '2026-10-22', true),
         ('kanae', '下書きの行事', '秋', '例年10月ごろ', '地区全体', 'テスト', '2026-10-22', false)`,
      `insert into scene_templates (season, title, reviewed_on, is_published) values
         ('春', '公開', '2026-10-22', true), ('夏', '下書き', null, false)`,
      `insert into scene_sentences (template_id, position, kind, body)
         select id, 1, 'データ', '{地区名}には{件数}か所あります。' from scene_templates`,
    );
    expect(district(data, "kanae").events.map((e) => e.name)).toEqual(["公開の行事"]);
    expect(district(data, "kamisato").events).toEqual([]);
    expect(data.scene_templates).toEqual([
      expect.objectContaining({ title: "公開", sentences: [expect.objectContaining({ body: "{地区名}には{件数}か所あります。" })] }),
    ]);
    const programs = await run<{ n: number }>("postgres", "select count(*)::int as n from support_programs where is_published");
    expect(data.support_programs).toHaveLength(programs[0].n);
  });

  it("応答は画面の読み込み（parseScreenData）でそのまま読め、公開した出典のデータが地区ごとに入る", async () => {
    const data = parseScreenData(
      await screenData(
        "update data_sources set is_published = true where id not in ('reinfolib_xkt006', 'reinfolib_xkt007')",
        `insert into market_stats (district_id, category, period_from, period_to, sample_count, median_value, p25_value, p75_value, source_id)
         values ('igara', 'land', '2021Q1', '2026Q1', 90, 12500, 4600, 19800, 'reinfolib_xit001')`,
      ),
      "2026-10-26",
    );
    expect(data.districtOrder).toEqual(["kamisato", "kanae", "igara", "chushin"]);
    const igara = data.districts.igara;
    expect(igara.market.land).toMatchObject({ status: "available", value: { median: 12500, p25: 4600, p75: 19800, sampleCount: 90 } });
    expect(igara.market.house_built_over_20y).toEqual({ status: "unavailable" });
    expect(igara.trainStations.status).toBe("none");
    expect(igara.trainOuting).toEqual({ status: "unavailable" });
    for (const id of data.districtOrder) {
      const d = data.districts[id];
      for (const state of [d.schools, d.childcare, d.afterSchoolClubs, d.evacuationSites, d.publicFacilities, d.busStops, d.population, d.busOuting]) {
        expect(state.status, id).toBe("available");
      }
    }
    expect(data.districts.kanae.busOuting).toMatchObject({ value: { originName: "鼎公民館前", dayType: "土曜" } });
    expect(data.districts.kanae.trainOuting.status).toBe("available");
  });
});
