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
  "bus_outings",
  "train_departures",
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

  it("CSV の94町名が入り、4地区それぞれに町名がある", async () => {
    const rows = await run<{ district_id: string | null; count: number }>(
      "anon",
      "select district_id, count(*)::int as count from town_district_map group by district_id order by district_id",
    );
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(94);
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
                           (select count(*)::int from train_departures) as departures`;
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
