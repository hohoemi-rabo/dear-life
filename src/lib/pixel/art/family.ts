// 家族の人物。1人ずつ文字の並びで描き、人数の組み合わせは familyCanvas で並べて作る。
// 輪郭は墨（k）で囲み、輪郭のない背景から浮き出るようにする
import type { SingleParent } from "../../conditions/labels.ts";
import { createCanvas, parseSprite, stamp, type Canvas } from "../canvas.ts";

// お父さん：短い髪・青い上着
const FATHER = parseSprite([
  "....kkkk....",
  "..kknnnnkk..",
  ".knnnnnnnnk.",
  ".knnnnnnnnk.",
  ".knfffffnnk.",
  ".kfkffffkfk.",
  ".kffffffffk.",
  ".kfcffffcfk.",
  "..kffffffk..",
  "...kkkkkk...",
  "..kbbwwbbk..",
  ".kbbbwwbbbk.",
  "kbbkbbbbkbbk",
  "kbbkbbbbkbbk",
  "kbbkbbbbkbbk",
  "kffkbbbbkffk",
  ".kkaaaaaakk.",
  "..kaaaaaak..",
  "..kaakkaak..",
  "..kaakkaak..",
  ".kkkk..kkkk.",
]);

// お母さん：肩までの髪・赤い上着
const MOTHER = parseSprite([
  "....kkkk....",
  "..kknnnnkk..",
  ".knnnnnnnnk.",
  "knnnnnnnnnnk",
  "knnffffffnnk",
  "knfkffffkfnk",
  "knffffffffnk",
  "knfcffffcfnk",
  "knnkffffknnk",
  ".knnkkkknnk.",
  "..krrwwrrk..",
  ".krrrwwrrrk.",
  "krrkrrrrkrrk",
  "krrkrrrrkrrk",
  "krrkrrrrkrrk",
  "kffkrrrrkffk",
  ".kkbbbbbbkk.",
  ".kbbbbbbbbk.",
  "..kkkkkkkk..",
  "...kfkkfk...",
  "..kkk..kkk..",
]);

// 子ども：黄色い帽子・若草の服
const CHILD = parseSprite([
  "...kkkk...",
  "..kyyyyk..",
  ".kyyyyyyk.",
  "kyyyyyyyyk",
  ".knffffnk.",
  ".kfkffkfk.",
  ".kcffffck.",
  "..kkkkkk..",
  ".krllllrk.",
  "klkrllrklk",
  "kfkllllkfk",
  ".kkbbbbkk.",
  "..kfkkfk..",
  ".kkk..kkk.",
]);

const GAP = 1;

// 大人と子どもを横に並べ、足元をそろえる。大人2人（both）なら お父さん・子ども…・お母さん、
// 大人1人なら選んだ大人・子ども… の順にする（イラストの並び src/lib/illust/family.ts と同じ）
export function familyCanvas(grownUps: SingleParent | "both", children: number): Canvas {
  if (!Number.isInteger(children) || children < 0 || children > 4) throw new RangeError(`子どもは0〜4人にしてください: ${children}`);
  const kids = Array.from({ length: children }, () => CHILD);
  const people =
    grownUps === "both" ? [FATHER, ...kids, MOTHER] : grownUps === "mother" ? [...kids, MOTHER] : [FATHER, ...kids];
  const width = people.reduce((sum, person) => sum + person.width, 0) + GAP * (people.length - 1);
  const height = Math.max(...people.map((person) => person.height));
  const canvas = createCanvas(width, height);
  let x = 0;
  for (const person of people) {
    stamp(canvas, person, x, height - person.height);
    x += person.width + GAP;
  }
  return canvas;
}
