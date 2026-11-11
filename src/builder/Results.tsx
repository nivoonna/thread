import type { Definition, Dimension } from "./models";
import type { calculate } from "./services";
import { dimensionLabels, numeratorLabel } from "./labels";

export function Results({
  result,
  definition,
  dimension,
}: {
  result: ReturnType<typeof calculate>;
  definition: Definition;
  dimension?: string;
}) {
  return (
    <>
      <div className="builder-result">
        {result.value === null
          ? "No eligible groups"
          : result.value.toFixed(2) + "%"}
      </div>
      <p>
        {result.numerator} matching / {result.denominator} eligible · distinct{" "}
        {result.grain} · {result.period} UTC creation cohort
      </p>
      {dimension && (
        <div className="builder-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {dimension
                    ? dimensionLabels[dimension as Dimension]
                    : "Group"}
                </th>
                <th>{numeratorLabel(definition)}</th>
                <th>Eligible</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {result.groups.map((g) => (
                <tr key={g.dimension}>
                  <td>{g.dimension}</td>
                  <td>{g.numerator}</td>
                  <td>{g.denominator}</td>
                  <td>{g.value === null ? "—" : g.value.toFixed(2) + "%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
