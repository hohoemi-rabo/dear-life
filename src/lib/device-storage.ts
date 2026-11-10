// 端末の保存領域（localStorage）。保存できない端末（Safari のプライベートモードなど）では読むだけで止まることがあるので、
// 使えないときは null を返す。端末に残すものは要件 8.2 の「端末に残すもの」に限る
export function deviceStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
