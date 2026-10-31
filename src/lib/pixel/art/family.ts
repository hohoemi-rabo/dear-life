// 家族の人物。1人ずつ文字の並びで描き、人数の組み合わせは familyCanvas で並べて作る。
// 輪郭は墨（k）で囲み、輪郭のない背景から浮き出るようにする
import { createCanvas, parseSprite, stamp, type Canvas } from "../canvas.ts";

// 大人1：短い髪・青い上着
const ADULT_1 = parseSprite([
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

// 大人2：肩までの髪・赤い上着
const ADULT_2 = parseSprite([
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

// 大人と子どもを横に並べ、足元をそろえる。子どもは大人のあいだに入れる（大人2人なら 大人・子ども…・大人）
export function familyCanvas(adults: 1 | 2, children: number): Canvas {
  if (!Number.isInteger(children) || children < 0 || children > 4) throw new RangeError(`子どもは0〜4人にしてください: ${children}`);
  const kids = Array.from({ length: children }, () => CHILD);
  const people = adults === 2 ? [ADULT_1, ...kids, ADULT_2] : [ADULT_1, ...kids];
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
