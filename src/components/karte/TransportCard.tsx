import { GofreelyLink } from "@/components/data/GofreelyLink";
import { Notice } from "@/components/ui/Notice";
import type { DistrictData, Outing, StationDepartures } from "@/lib/data/screen-data";
import { formatJaDateWithWeekday, formatServiceTime } from "@/lib/format";
import { NOTICES } from "@/lib/notices";
import { CountValue, DataSection, FacilityList } from "./parts";

// 上りは豊橋方面、下りは辰野方面（JR飯田線。026）
const DIRECTION_LABELS: Readonly<Record<StationDepartures["direction"], string>> = {
  上り: "上り（豊橋方面）",
  下り: "下り（辰野方面）",
};

// 交通カード（要件 4章・026）。バス停と駅、駅ごとの本数・始発・最終。
// 車0台なら注意書きと、冬の場面で使った便（行き・帰りの時刻と本数）、gofreely へのリンクを出す
export function TransportCard({ district, noCar }: { district: DistrictData; noCar: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {noCar && <Notice>{NOTICES.carFree}</Notice>}
      <DataSection title="バス停" state={district.busStops}>
        {(stops) => <FacilityList facilities={stops} label="バス停" />}
      </DataSection>
      <DataSection title="電車の駅" state={district.trainStations} none="地区内に駅はありません。">
        {(stations) => <FacilityList facilities={stations} label="駅" />}
      </DataSection>
      {district.trainStations.status !== "none" && (
        <DataSection title="駅ごとの1日の本数（特急を除く）" state={district.trainDepartures}>
          {(departures) => <DeparturesTable departures={departures} />}
        </DataSection>
      )}
      {noCar && (
        <>
          <DataSection title="冬の場面で使ったバスの便" state={district.busOuting}>
            {(outing) => (
              <>
                <p className="text-xs text-ink-muted">{formatJaDateWithWeekday(outing.serviceDate)}の時刻表</p>
                <OutingDetails outing={outing} mode="バス" />
                <GofreelyLink outing={outing} className="self-start" />
              </>
            )}
          </DataSection>
          {district.trainStations.status !== "none" && (
            <DataSection title="冬の場面で使った電車の便" state={district.trainOuting}>
              {(outing) => <OutingDetails outing={outing} mode="電車" />}
            </DataSection>
          )}
        </>
      )}
    </div>
  );
}

function DeparturesTable({ departures }: { departures: readonly StationDepartures[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-ink-muted">
        <tr>
          <th scope="col" className="py-1 font-normal">駅・方面</th>
          <th scope="col" className="py-1 font-normal">本数</th>
          <th scope="col" className="py-1 font-normal">始発</th>
          <th scope="col" className="py-1 font-normal">最終</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {departures.map((row) => (
          <tr key={`${row.stationName}-${row.direction}`}>
            <th scope="row" className="py-1.5 font-bold">
              {row.stationName}
              <span className="block text-xs font-normal text-ink-muted">{DIRECTION_LABELS[row.direction]}</span>
            </th>
            <td className="py-1.5 font-bold tabular-nums">{row.tripsPerDay}本</td>
            <td className="py-1.5 tabular-nums">{formatServiceTime(row.firstDeparture)}</td>
            <td className="py-1.5 tabular-nums">{formatServiceTime(row.lastDeparture)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 行き・帰り・帰りの次の便と、本数（要件 6.3）
function OutingDetails({ outing, mode }: { outing: Outing; mode: "バス" | "電車" }) {
  const trip = (label: string, from: string, to: string, value: Outing["outbound"]) => (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd>
        <span className="font-bold tabular-nums">
          {formatServiceTime(value.departure)} {from}発 → {formatServiceTime(value.arrival)} {to}着
        </span>
        <span className="ml-2 text-xs text-ink-muted">{value.line}</span>
      </dd>
    </>
  );
  return (
    <>
      <p className="font-bold">
        {outing.originName} → {outing.destinationName}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {trip("行き", outing.originName, outing.destinationName, outing.outbound)}
        {trip("帰り", outing.destinationName, outing.originName, outing.return)}
        {outing.nextReturn ? (
          trip("帰りの次の便", outing.destinationName, outing.originName, outing.nextReturn)
        ) : (
          <>
            <dt className="text-ink-muted">帰りの次の便</dt>
            <dd>次の便はありません</dd>
          </>
        )}
      </dl>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <p className="text-xs text-ink-muted">
            {outing.originName}から{outing.destinationName}へ乗りかえなしで行く{mode}（1日）
          </p>
          <CountValue count={outing.outboundTripsPerDay} unit="本" />
        </div>
        <div>
          <p className="text-xs text-ink-muted">帰りの{mode}（1日）</p>
          <CountValue count={outing.returnTripsPerDay} unit="本" />
        </div>
        <div>
          <p className="text-xs text-ink-muted">
            {outing.originName}を出る{mode}（行き先を問わず・1日）
          </p>
          <CountValue count={outing.originDeparturesPerDay} unit="本" />
        </div>
      </div>
    </>
  );
}
