// 画面の見出し・ボタン・季節のタブなどに付ける小さなドット絵（027。デザインイメージのアイコンをドット絵で描く）。
// アイコンは 16×16 ドット。ロゴと飾りは大きさが違う。どれも共通の16色だけを使う
import { parseSprite, type Canvas } from "../canvas.ts";

// 芽（見出し・「データについて」・「登録不要」の印）
const SPROUT = [
  "................",
  "..ddd......ddd..",
  ".dllld....dllld.",
  "dllllgd..dglllld",
  "dlllggd..dggllld",
  ".dgggdd..ddgggd.",
  "..ddd..gd..ddd..",
  ".......gd.......",
  ".......gd.......",
  ".......gd.......",
  ".......gd.......",
  "...nnnnnnnnnn...",
  "..nnnnnnnnnnnn..",
  "..knnnnnnnnnnk..",
  "...kkkkkkkkkk...",
  "................",
];

// カレンダー（地区の行事）
const CALENDAR = [
  "................",
  "...kk......kk...",
  "...kk......kk...",
  ".kkkkkkkkkkkkkk.",
  ".krrrrrrrrrrrrk.",
  ".krrrrrrrrrrrrk.",
  ".kkkkkkkkkkkkkk.",
  ".kwwwwwwwwwwwwk.",
  ".kwawwawwawwawk.",
  ".kwwwwwwwwwwwwk.",
  ".kwawwawwrrwawk.",
  ".kwwwwwwwrrwwwk.",
  ".kwawwawwwwwawk.",
  ".kwwwwwwwwwwwwk.",
  ".kkkkkkkkkkkkkk.",
  "................",
];

// 開いた本（暮らしの根拠・カルテで確認）
const BOOK = [
  "................",
  "................",
  ".kkkk......kkkk.",
  "kwwwwkk..kkwwwwk",
  "kwaaawwkkwwaaawk",
  "kwwwwwwkkwwwwwwk",
  "kwaaaawkkwaaaawk",
  "kwwwwwwkkwwwwwwk",
  "kwaaawwkkwwaaawk",
  "kwwwwwwkkwwwwwwk",
  "kwaaaawkkwaaaawk",
  "kwwwwwwkkwwwwwwk",
  "kddddddkkddddddk",
  ".kkkkkkddkkkkkk.",
  "................",
  "................",
];

// 雪をかぶった山（対象の4地区）
const MOUNTAIN = [
  "................",
  "................",
  ".......kk.......",
  "......kwwk......",
  ".....kwwwwk.....",
  ".....kgwwgk.k...",
  "....kgggggkkdk..",
  "....kgggggdkddk.",
  "...kggglgggkdddk",
  "..kgglllggggkddk",
  "..kglllllgggddk.",
  ".kgllllllggggddk",
  "kggllllllgggggdk",
  "kkkkkkkkkkkkkkkk",
  "................",
  "................",
];

// 地図のピン（地区）
const PIN = [
  "................",
  ".....kkkkk......",
  "....krrrrrk.....",
  "...krrwwrrrk....",
  "...krwwwwrrk....",
  "...krwwwwrrk....",
  "...krrwwrrrk....",
  "...krrrrrrrk....",
  "....krrrrrk.....",
  "....krrrrrk.....",
  ".....krrrk......",
  ".....krrrk......",
  "......krk.......",
  "......krk.......",
  ".......k........",
  "................",
];

// 家（住まい）
const HOUSE = [
  "................",
  "................",
  ".......kk.......",
  "......krrk......",
  ".....krrrrk.....",
  "....krrrrrrk....",
  "...krrrrrrrrk...",
  "..krrrrrrrrrrk..",
  ".kkkkkkkkkkkkkk.",
  "..kffffffffffk..",
  "..kfssfffnnffk..",
  "..kfssfffnnffk..",
  "..kffffffnnffk..",
  "..kffffffnnffk..",
  "..kkkkkkkkkkkk..",
  "................",
];

// 車（車の台数）
const CAR = [
  "................",
  "................",
  "................",
  "....kkkkkkk.....",
  "...krsskssrk....",
  "...krsskssrk....",
  ".kkkrrrrrrrkkk..",
  "krrrrrrrrrrrrrk.",
  "kyrrrrrrrrrrrrok",
  "krrrrrrrrrrrrrrk",
  "kkkkkkkkkkkkkkkk",
  "..kak......kak..",
  "..kkk......kkk..",
  "................",
  "................",
  "................",
];

// 家族（大人2人と子ども1人）
const FAMILY = [
  "................",
  "................",
  "..nnn......nnn..",
  ".nfffn....nfffn.",
  ".nfffn....nfffn.",
  "..fff..nn..fff..",
  ".bbbbb.ff.rrrrr.",
  "fbbbbbfyyfrrrrrf",
  ".bbbbb.yy.rrrrr.",
  ".bbbbb.aa.rrrrr.",
  "..a.a..aa..a.a..",
  "..a.a..aa..a.a..",
  "..k.k..kk..k.k..",
  "................",
  "................",
  "................",
];

// 桜（春）
const SAKURA = [
  "................",
  "......kkk.......",
  ".....kcccr......",
  "..kk.kcccr.kk...",
  ".kccrkccrkcccr..",
  ".kcccckcckccccr.",
  "..kcccyyyccccr..",
  "...kccyoycccr...",
  "..kcccyyycccck..",
  ".kccccckcccccck.",
  ".kcccrk.kccccr..",
  "..kcrk...kccr...",
  "...kk.....kk....",
  "................",
  "................",
  "................",
];

// 傘と雨（夏の大雨）
const UMBRELLA = [
  "................",
  ".......k........",
  ".....kkkkk......",
  "...kkbbbbbkk....",
  "..kbbbbbbbbbk...",
  ".kbbbbbbbbbbbk..",
  ".kbbbbbbbbbbbk..",
  "kbbbbbbbbbbbbbk.",
  "kkkbkkkbkkkbkkk.",
  ".......k........",
  ".s.....k...s....",
  ".......k........",
  "...s...k......s.",
  ".......k.k......",
  "........k.......",
  "................",
];

// 紅葉（秋）
const MAPLE = [
  "................",
  ".......k........",
  "......kok.......",
  "..k...kok...k...",
  "..kok.kok..kok..",
  "..koorkoorkook..",
  "...koooooooook..",
  ".kkoooooooooookk",
  ".kooooooooooook.",
  "..kooooooooook..",
  "...koooooooook..",
  "..koookoookoook.",
  "..kkk..knk..kkk.",
  ".......knk......",
  ".......knk......",
  "................",
];

// 雪の結晶（冬）
const SNOW = [
  "................",
  ".......s........",
  ".....s.b.s......",
  "......sbs.......",
  "..s....b....s...",
  "...bb..b..bb....",
  ".....bbbbb......",
  ".sbbbbbwbbbbbs..",
  ".....bbbbb......",
  "...bb..b..bb....",
  "..s....b....s...",
  "......sbs.......",
  ".....s.b.s......",
  ".......s........",
  "................",
  "................",
];

// 棒グラフ（地区くらべ）
const CHART = [
  "................",
  "................",
  "...........kkk..",
  "...........kdk..",
  "...........kdk..",
  ".......kkk.kdk..",
  ".......kdk.kdk..",
  ".......kdk.kdk..",
  "...kkk.kdk.kdk..",
  "...kdk.kdk.kdk..",
  "...kdk.kdk.kdk..",
  "...kdk.kdk.kdk..",
  "..kkkkkkkkkkkkk.",
  "................",
  "................",
  "................",
];

// 地図（地図で見る）
const MAP = [
  "................",
  "................",
  ".kkkk.kkkk.kkkk.",
  ".kpgkkplpkkgpkk.",
  ".kpgkpplppkgppk.",
  ".kggkplllpkggpk.",
  ".kpgkpplppkgppk.",
  ".kppkpbppbkppgk.",
  ".kpbkbbppbkbbgk.",
  ".kbbkpppbbkpbbk.",
  ".kppkppppbkpppk.",
  ".kpgkppppbkgppk.",
  ".kkkk.kkkk.kkkk.",
  "................",
  "................",
  "................",
];

// 歯車（条件を変える）
const GEAR = [
  "................",
  "......kkk.......",
  "......kak.......",
  "..kk.kaaak.kk...",
  "..kakkaaakkak...",
  "...kaaaaaaak....",
  ".kkaaakkkaaakk..",
  ".kaaaak.kaaaak..",
  ".kkaaakkkaaakk..",
  "...kaaaaaaak....",
  "..kakkaaakkak...",
  "..kk.kaaak.kk...",
  "......kak.......",
  "......kkk.......",
  "................",
  "................",
];

// 回る矢印（選び直す）
const REFRESH = [
  "................",
  "................",
  ".....dddddd.....",
  "...ddd....ddd...",
  "..dd........dd..",
  ".dd..........d..",
  ".d.........ddddd",
  ".d..........ddd.",
  "..d..........d..",
  ".ddd..........d.",
  "ddddd.........d.",
  "..d..........dd.",
  "..dd........dd..",
  "...ddd....ddd...",
  ".....dddddd.....",
  "................",
];

// 校舎（学校・保育施設）
const SCHOOL = [
  "................",
  ".......kk.......",
  "......kyyk......",
  "......kyyk......",
  "....kkkkkkkk....",
  "....kwwkkwwk....",
  "..kkkwwwwwwkkk..",
  "kkkkkkkkkkkkkkkk",
  "kwwwwwwwwwwwwwwk",
  "kwsswsswwsswsswk",
  "kwsswsswwsswsswk",
  "kwwwwwwnnwwwwwwk",
  "kwsswswnnwssswwk",
  "kwwwwwwnnwwwwwwk",
  "kkkkkkkkkkkkkkkk",
  "................",
];

// ヘルメット（防災）
const HELMET = [
  "................",
  "................",
  "................",
  "......kkkk......",
  "....kkyyyykk....",
  "...kyyywyyyyk...",
  "..kyyywyyyyyyk..",
  "..kyywyyyyyyyk..",
  ".kyyyyyyyyyyyyk.",
  ".kyyyyyyyyyyyyk.",
  "kkkkkkkkkkkkkkkk",
  "kooooooooooooook",
  "kkkkkkkkkkkkkkkk",
  "................",
  "................",
  "................",
];

// バス（交通）
const BUS = [
  "................",
  "................",
  "..kkkkkkkkkkkk..",
  ".kwwwwwwwwwwwwk.",
  ".kssksskssksssk.",
  ".kssksskssksssk.",
  ".kwwwwwwwwwwwwk.",
  ".kggggggggggggk.",
  ".kwwwwwwwwwwwyk.",
  ".kwwwwwwwwwwwwk.",
  ".kkkkkkkkkkkkkk.",
  "...kak....kak...",
  "...kkk....kkk...",
  "................",
  "................",
  "................",
];

// 人の並び（人口）
const PEOPLE = [
  "................",
  "................",
  "......kkk.......",
  ".....kfffk......",
  "..kk.kfffk.kk...",
  ".kffk.kkk.kffk..",
  ".kffkkbbbkkffk..",
  "..kkkbbbbbkkk...",
  ".kgggkbbbkrrrk..",
  ".kgggkbbbkrrrk..",
  ".kgggkbbbkrrrk..",
  ".kgggkbbbkrrrk..",
  ".kkkkkkkkkkkkk..",
  "................",
  "................",
  "................",
];

// 公民館などの建物（公共施設）
const BUILDING = [
  "................",
  ".......k........",
  ".......kr.......",
  ".......krr......",
  ".......k........",
  "....kkkkkkkk....",
  "...kmmmmmmmmk...",
  "..kkkkkkkkkkkk..",
  "..kwwwwwwwwwwk..",
  "..kwsswwwwsswk..",
  "..kwsswwwwsswk..",
  "..kwwwwnnwwwwk..",
  "..kwsswnnwsswk..",
  "..kwwwwnnwwwwk..",
  ".kkkkkkkkkkkkkk.",
  "................",
];

// 手のひらとハート（支援制度）
const SUPPORT = [
  "................",
  "................",
  "....kk..kk......",
  "...krrkkrrk.....",
  "...krrrrrrk.....",
  "...krrrrrrk.....",
  "....krrrrk......",
  ".....krrk.......",
  "kk....kk....kk..",
  "kfk........kfk..",
  "kffk......kffk..",
  ".kffkkkkkkffk...",
  "..kffffffffk....",
  "...kkkkkkkk.....",
  "................",
  "................",
];

// i の印（注意書き）
const INFO = [
  "................",
  "....kkkkkkkk....",
  "...kddddddddk...",
  "..kddddwwddddk..",
  ".kdddddwwdddddk.",
  ".kddddddddddddk.",
  "kdddddwwwddddddk",
  "kddddddwwddddddk",
  "kddddddwwddddddk",
  "kddddddwwddddddk",
  ".kdddddwwdddddk.",
  ".kddddwwwwddddk.",
  "..kddddddddddk..",
  "...kddddddddk...",
  "....kkkkkkkk....",
  "................",
];

// 書類（出典・確認日）
const DOCUMENT = [
  "................",
  "...kkkkkkkk.....",
  "...kwwwwwwkk....",
  "...kwwwwwwkwk...",
  "...kwaaaawkkkk..",
  "...kwwwwwwwwwk..",
  "...kwaaaaaaawk..",
  "...kwwwwwwwwwk..",
  "...kwaaaaaaawk..",
  "...kwwwwwwwwwk..",
  "...kwaaaaaawwk..",
  "...kwwwwwwwwwk..",
  "...kwaaaaawwwk..",
  "...kwwwwwwwwwk..",
  "...kkkkkkkkkkk..",
  "................",
];

// ロゴの絵：赤い屋根の家と芽（24×20）
const LOGO = [
  "........................",
  "........kk..........ddd.",
  ".......krrk........dllld",
  "......krrrrk.kk...dlllgd",
  ".....krrrrrrkkk..ddggdd.",
  "....krrrrrrrrkk.dd.gd...",
  "...krrrrrrrrrrk....gd...",
  "..krrrrrrrrrrrrk...gd...",
  ".kkkkkkkkkkkkkkkk..gd...",
  "..kwwwwwwwwwwwwk...gd...",
  "..kwsswwwwwwsswk...gd...",
  "..kwsswwwwwwsswk...gd...",
  "..kwwwwwnnwwwwwk...gd...",
  "..kwwwwwnnwwwwwk...gd...",
  "..kwwwwwnnwwwwwk...gd...",
  "..kwwwwwnnwwwwwk..lgdl..",
  "..kkkkkkkkkkkkkkk.lgdl..",
  ".lglglglglglglglglglglgl",
  "gggggggggggggggggggggggg",
  "dgdgdgdgdgdgdgdgdgdgdgdg",
];

// 画面の下の草花（48×10）
const GRASS = [
  "......c.................y................c......",
  ".....cyc.......l.......yoy..............cyc.....",
  "......c..l....lgl.......y.......l........c...l..",
  "..l...g.lgl...lgl...l...g...l..lgl...l...g..lgl.",
  ".lgl..g.lgl..lglgl.lgl..g..lgl.lgl..lgl..g..lgl.",
  ".lgl.lglglgl.lggdl.lgl.lgl.lgl.lgdl.lgl.lgl.lggl",
  "lggl.lggdlgl.lgddl.lggllggdlgllggdllggl.lggllggd",
  "lgdgllgddlgdllgddgllgdglgdgdgdlgdddlgdgllgdglgdd",
  "gddggggdddgddggddgggddggddgddggdddggddgggddggddd",
  "dddddddddddddddddddddddddddddddddddddddddddddddd",
];

// 小さな木（右下の飾り）
const TREE = [
  "....ddd.....",
  "..ddgggdd...",
  ".dglgggggd..",
  "dglllgggggd.",
  "dggllggggdd.",
  "dggggggdddd.",
  ".dgggggddd..",
  "..ddddddd...",
  ".....nn.....",
  ".....nn.....",
  "....nnnn....",
  "..llgggggl..",
];

// フッターの山並み（96×12）
const MOUNTAINS = [
  "...............................................pp...............................................",
  "..............................................pppp..............................................",
  "..........pp.................................pppppp.........................pp..................",
  ".........pppp...............................pppppppp.......................pppp.................",
  "........pppppp...............mm............pppppppppp.....................pppppp................",
  ".......pppppppp.............mmmm..........pppppppppppp...................pppppppp...............",
  "......pppppppppp...........mmmmmm........pppppppppppppp.......mm........pppppppppp..............",
  ".....pppppppppppp.........mmmmmmmm......pppppppppppppppp.....mmmm......pppppppppppp.........mm..",
  "....pppppppppppppp.......mmmmmmmmmm....pppppppppppppppppp...mmmmmm....pppppppppppppp.......mmmm.",
  "...pppppppppppppppp.....mmmmmmmmmmmm..pppppppppppppppppppp.mmmmmmmm..pppppppppppppppp.....mmmmmm",
  "..pppppppppppppppppp...mmmmmmmmmmmmmmpppppppppppppppppppppmmmmmmmmmmpppppppppppppppppp...mmmmmmm",
  ".pppppppppppppppppppp.mmmmmmmmmmmmmmmmppppppppppppppppppppmmmmmmmmmmmpppppppppppppppppp.mmmmmmmm",
];

export const sprout = (): Canvas => parseSprite(SPROUT);
export const calendar = (): Canvas => parseSprite(CALENDAR);
export const book = (): Canvas => parseSprite(BOOK);
export const mountainIcon = (): Canvas => parseSprite(MOUNTAIN);
export const pin = (): Canvas => parseSprite(PIN);
export const house = (): Canvas => parseSprite(HOUSE);
export const carIcon = (): Canvas => parseSprite(CAR);
export const family = (): Canvas => parseSprite(FAMILY);
export const sakura = (): Canvas => parseSprite(SAKURA);
export const umbrella = (): Canvas => parseSprite(UMBRELLA);
export const maple = (): Canvas => parseSprite(MAPLE);
export const snow = (): Canvas => parseSprite(SNOW);
export const chart = (): Canvas => parseSprite(CHART);
export const map = (): Canvas => parseSprite(MAP);
export const gear = (): Canvas => parseSprite(GEAR);
export const refresh = (): Canvas => parseSprite(REFRESH);
export const schoolIcon = (): Canvas => parseSprite(SCHOOL);
export const helmet = (): Canvas => parseSprite(HELMET);
export const busIcon = (): Canvas => parseSprite(BUS);
export const people = (): Canvas => parseSprite(PEOPLE);
export const building = (): Canvas => parseSprite(BUILDING);
export const support = (): Canvas => parseSprite(SUPPORT);
export const info = (): Canvas => parseSprite(INFO);
export const documentIcon = (): Canvas => parseSprite(DOCUMENT);
export const logo = (): Canvas => parseSprite(LOGO);
export const grass = (): Canvas => parseSprite(GRASS);
export const smallTree = (): Canvas => parseSprite(TREE);
export const mountains = (): Canvas => parseSprite(MOUNTAINS);
