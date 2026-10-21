"""飯田市 不動産取引価格CSV（5年分）を地区別・築年数別に集計する。

使い方:
  python3 aggregate_iida.py <取引CSV> <地区対応表CSV> <出力CSV>
"""
import sys
import pandas as pd

src, map_path, out_path = sys.argv[1:4]

df = pd.read_csv(src, encoding="cp932")
mp = pd.read_csv(map_path, encoding="utf-8-sig")

# 地区を付与
df = df.merge(mp[["町名", "地区"]], left_on="地区名", right_on="町名", how="left")
unmapped = df[df["地区"].isna()]["地区名"].unique()
if len(unmapped):
    print("対応表にない町名:", list(unmapped))

# 相場を歪める特殊な取引を除外
exclude = ["調停・競売等", "関係者間取引", "隣地の購入"]
df = df[~df["取引の事情等"].isin(exclude)]

df["取引年"] = df["取引時期"].str.extract(r"(\d{4})年").astype(float)
df["建築年数値"] = pd.to_numeric(df["建築年"].str.replace("年", ""), errors="coerce")
df["築年数"] = df["取引年"] - df["建築年数値"]
df["価格"] = pd.to_numeric(df["取引価格（総額）"], errors="coerce")
df["㎡単価"] = pd.to_numeric(df["取引価格（㎡単価）"], errors="coerce")
df["面積"] = pd.to_numeric(df["面積（㎡）"], errors="coerce")

# 土地: ㎡単価が空の行は 総額÷面積 で補う
land = df[df["種類"] == "宅地(土地)"].copy()
land["㎡単価"] = land["㎡単価"].fillna(land["価格"] / land["面積"])

# 戸建て: 用途が住宅を含む（空欄も含める）
house = df[(df["種類"] == "宅地(土地と建物)")
           & (df["用途"].isna() | df["用途"].str.contains("住宅", na=False))].copy()


def bucket(y):
    if pd.isna(y):
        return "築年不明"
    return "築20年以内" if y <= 20 else "築21年以上"


house["築区分"] = house["築年数"].apply(bucket)

rows = []
for district in sorted(df["地区"].dropna().unique()):
    l = land[land["地区"] == district]
    h = house[house["地区"] == district]
    r = {
        "地区": district,
        "土地_件数": len(l),
        "土地_㎡単価_中央値(円)": l["㎡単価"].median(),
        "土地_㎡単価_下位25%(円)": l["㎡単価"].quantile(0.25),
        "土地_㎡単価_上位25%(円)": l["㎡単価"].quantile(0.75),
        "戸建て_件数": len(h),
        "戸建て_中央値(万円)": h["価格"].median() / 1e4,
    }
    for b in ["築20年以内", "築21年以上"]:
        hb = h[h["築区分"] == b]
        r[f"{b}_件数"] = len(hb)
        r[f"{b}_中央値(万円)"] = hb["価格"].median() / 1e4
    rows.append(r)

out = pd.DataFrame(rows).sort_values("土地_件数", ascending=False)
out.to_csv(out_path, index=False, encoding="utf-8-sig", float_format="%.0f")
print(out.to_string(index=False, float_format=lambda x: f"{x:,.0f}"))
