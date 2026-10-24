// 取り込みスクリプトがマイグレーションの SQL を書き出すときの値の書き方（004・010・026・009）。
// 元データの文字列をそのまま埋め込むので、引用符は必ずここを通して書く
export function sqlLiteral(value: string | null): string {
  return value === null ? "null" : `'${value.replace(/'/g, "''")}'`;
}

export function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}
