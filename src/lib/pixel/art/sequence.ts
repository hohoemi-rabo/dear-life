// 決まった並びを返す擬似乱数（花・花びら・雨粒の位置に使う）。同じ種なら毎回同じ絵になる。
// 場面の中身（季節・出来事）を選ぶのには使わない（要件 6.5）
export function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}
