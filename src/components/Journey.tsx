import { useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  SlidersHorizontal,
  Users,
  Play,
  ArrowUpRight,
  GitCompareArrows,
  CalendarDays,
} from "lucide-react";
import {
  selectGroups,
  metrics,
  funnel,
  pct,
  filterLabel,
  PERIOD_LABEL,
  SEGMENTS,
  DEFAULT_FILTERS,
  stageGroups,
  detailedSessions,
  db,
  OUTCOME_LABEL,
  type Filters,
  type Group,
} from "../data";
import { Empty } from "./Shared";
interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  stage: number;
  mode: "reached" | "abandoned";
  setMode: (mode: "reached" | "abandoned") => void;
  setStage: (n: number) => void;
  onSession: (id: string) => void;
  compare: boolean;
  setCompare: (b: boolean) => void;
}
export function Journey({
  filters,
  setFilters,
  stage,
  mode,
  setMode,
  setStage,
  onSession,
  compare,
  setCompare,
}: Props) {
  const [a, setA] = useState("large-split"),
    [b, setB] = useState("small");
  const groups = selectGroups(filters),
    steps = funnel(groups),
    m = metrics(groups),
    selected = steps[stage],
    matching = stageGroups(groups, stage, mode),
    sessions = detailedSessions(matching);
  const replayGroups = matching.filter((g) =>
    sessions.some((s) => s.groupId === g.id),
  );
  const comparable = (id: string) =>
    selectGroups({
      ...DEFAULT_FILTERS,
      ...SEGMENTS.find((s) => s.id === id)!.filter,
      period: filters.period,
    });
  const am = metrics(comparable(a)),
    bm = metrics(comparable(b));
  const af = funnel(comparable(a)),
    bf = funnel(comparable(b));
  const update = (k: keyof Filters, v: string) =>
    setFilters({ ...filters, [k]: v });
  return (
    <div className="page journey">
      <div className="page-title">
        <div>
          <div className="eyebrow">FOLLOW THE JOURNEY</div>
          <h1>
            From invitation to order<span className="title-dot">.</span>
          </h1>
          <p>Find the break. Follow it to the people behind the numbers.</p>
        </div>
        <label className="select-wrap">
          <CalendarDays size={15} />
          <select
            aria-label="Analysis period"
            value={filters.period}
            onChange={(e) => update("period", e.target.value)}
          >
            {Object.entries(PERIOD_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-bar">
        <SlidersHorizontal size={16} />
        <label>
          <span>Group size</span>
          <select
            aria-label="Group size"
            value={filters.size}
            onChange={(e) => update("size", e.target.value)}
          >
            <option value="all">All sizes</option>
            <option value="small">2–3 participants</option>
            <option value="large">4+ participants</option>
          </select>
        </label>
        <label>
          <span>Payment</span>
          <select
            aria-label="Payment type"
            value={filters.payment}
            onChange={(e) => update("payment", e.target.value)}
          >
            <option value="all">All payments</option>
            <option value="split">Split payment</option>
            <option value="single">Single payer</option>
          </select>
        </label>
        <label>
          <span>Outcome</span>
          <select
            aria-label="Order outcome"
            value={filters.outcome}
            onChange={(e) => update("outcome", e.target.value)}
          >
            <option value="all">All outcomes</option>
            <option value="completed">Completed orders</option>
            <option value="abandoned">Abandoned orders</option>
          </select>
        </label>
        <button
          className="text-button reset"
          onClick={() =>
            setFilters({ ...DEFAULT_FILTERS, period: filters.period })
          }
        >
          Reset
        </button>
        <button
          className={`button compact ${compare ? "selected" : ""}`}
          onClick={() => setCompare(!compare)}
          aria-pressed={compare}
        >
          <GitCompareArrows size={15} />
          Compare segments
        </button>
      </div>
      <section className="panel funnel-panel">
        <div className="panel-header">
          <div>
            <h2>Group Order funnel</h2>
            <p>One group, counted once. Multiple participants, connected.</p>
          </div>
          <div className="funnel-summary">
            <strong>{pct(m.rate)}</strong>
            <span>overall completion</span>
            <span className="divider" />
            <Users size={15} />
            <b>{groups.length}</b>
            <span>Group Orders</span>
          </div>
        </div>
        <div className="funnel-scroll">
          <div className="funnel-chart">
            {steps.map((s, i) => (
              <button
                key={s.label}
                onClick={() => {
                  setStage(i);
                }}
                className={`funnel-stage ${stage === i ? "active" : ""}`}
                aria-pressed={stage === i}
                aria-label={`${s.label}: ${s.count} reached, ${s.drop} abandoned`}
              >
                <div className="stage-heading">
                  <span className="stage-index">0{i + 1}</span>
                  <span>{s.label}</span>
                </div>
                <div className="stage-value">
                  {s.count.toLocaleString()}
                  <small>{pct(s.rate)}</small>
                </div>
                <div className="bar-area">
                  <div
                    className={`funnel-bar ${i >= 5 ? "late" : ""}`}
                    style={{ height: `${Math.max(s.rate, 1)}%` }}
                  >
                    <span>
                      {i === 6
                        ? "Confirmed"
                        : i === 5
                          ? "Submitted"
                          : i === 4
                            ? "Checkout"
                            : ""}
                    </span>
                  </div>
                </div>
                <div className="stage-conversion">
                  {i === 0
                    ? "Starting cohort"
                    : `${pct(s.stepRate)} from prior step`}
                </div>
                <div className="drop-label">
                  {i < 6 ? (
                    <>
                      <ArrowDown size={12} />
                      {s.drop} stopped here
                    </>
                  ) : (
                    <>
                      <span className="status-dot" />
                      Business outcome
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="funnel-caption">
          <span>
            <span className="status-dot" />
            Click a stage to explore its underlying groups
          </span>
          <span>Submission ≠ confirmation</span>
        </div>
      </section>
      {compare && (
        <section className="panel comparison">
          <div className="panel-header">
            <div>
              <h2>Two cohorts. One definition.</h2>
              <p>Independent segments, same period. Cohorts may overlap.</p>
            </div>
            <span className="tiny-label">CONFIRMED / CREATED</span>
          </div>
          <div className="comparison-body">
            <div className="compare-select">
              <label>
                COHORT A
                <select
                  aria-label="Comparison cohort A"
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                >
                  {SEGMENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <strong>{pct(am.rate)}</strong>
              <span>
                {am.confirmed}/{am.total} groups
              </span>
            </div>
            <div className="compare-mini">
              {af.map((s, i) => (
                <div
                  key={s.label}
                  title={`${s.label}: ${pct(s.rate)} / ${pct(bf[i].rate)}`}
                >
                  <div className="paired-bars">
                    <i style={{ height: `${s.rate}%` }} />
                    <i style={{ height: `${bf[i].rate}%` }} />
                  </div>
                  <small>0{i + 1}</small>
                </div>
              ))}
            </div>
            <div className="compare-select secondary-cohort">
              <label>
                COHORT B
                <select
                  aria-label="Comparison cohort B"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                >
                  {SEGMENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <strong>{pct(bm.rate)}</strong>
              <span>
                {bm.confirmed}/{bm.total} groups
              </span>
            </div>
          </div>
        </section>
      )}
      <section className="panel evidence-list">
        <div className="panel-header">
          <div>
            <div className="eyebrow">
              BEHIND THE DROP-OFF · STEP 0{stage + 1}
            </div>
            <h2>
              {selected.label} <ArrowRight size={16} />{" "}
              {stage === 6
                ? "Confirmed business outcomes"
                : "What happened next?"}
            </h2>
            <p>
              {matching.length} groups · {filterLabel(filters)}
            </p>
          </div>
          <div className="segmented-control">
            <button
              className={mode === "abandoned" ? "active" : ""}
              onClick={() => setMode("abandoned")}
              disabled={stage === 6}
            >
              Abandoned ({selected.drop})
            </button>
            <button
              className={mode === "reached" ? "active" : ""}
              onClick={() => setMode("reached")}
            >
              Reached ({selected.count})
            </button>
          </div>
        </div>
        {replayGroups.length > 0 ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Group / session</th>
                    <th>Participants</th>
                    <th>Recorded outcome</th>
                    <th>Experience</th>
                    <th>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {replayGroups.map((g) => (
                    <ReplayRow key={g.id} g={g} onSession={onSession} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="list-note">
              {replayGroups.length} curated groups with detailed reconstruction,
              out of {matching.length} matching groups. These examples are not a
              representative sample.
            </div>
          </>
        ) : (
          <Empty
            title={
              matching.length
                ? "No detailed replay in this selection"
                : "No groups match this step"
            }
          >
            {matching.length
              ? `${matching.length} matching groups have aggregate records only. Try “Reached” at checkout or broaden the filters to explore the curated replays.`
              : "Choose another stage or broaden your filters. Final-stage confirmation has no subsequent drop-off."}
          </Empty>
        )}
      </section>
      <footer className="page-footer">
        <span>Ordered funnel · unit: Group Orders</span>
        <span>Synthetic data · counts recalculate with every filter</span>
      </footer>
    </div>
  );
}
function ReplayRow({
  g,
  onSession,
}: {
  g: Group;
  onSession: (id: string) => void;
}) {
  const sessions = db.sessions.filter((s) => s.groupId === g.id && s.detailed);
  return (
    <tr>
      <td>
        <strong className="mono">{g.id}</strong>
        <small>
          {sessions.length} detailed{" "}
          {sessions.length === 1 ? "session" : "sessions"} · Oct 22
        </small>
      </td>
      <td>
        <div className="avatar-stack">
          {Array.from({ length: Math.min(g.size, 3) }, (_, i) => (
            <span key={i}>{["A", "S", "M"][i]}</span>
          ))}
          {g.size > 3 && <b>+{g.size - 3}</b>}
        </div>
        <small>
          {g.paymentType === "split" ? "Split payment" : "Single payer"}
        </small>
      </td>
      <td>
        <span
          className={`outcome ${g.outcome === "confirmed" ? "success" : "warning"}`}
        >
          <i />
          {OUTCOME_LABEL[g.outcome]}
        </span>
      </td>
      <td>
        {g.outcome === "payment_failed"
          ? "Host waiting · participant declined"
          : g.outcome === "deadline_expired"
            ? "Group closes before submission"
            : g.outcome === "checkout_confusion"
              ? "Repeated checkout visits"
              : "Payment to confirmation"}
      </td>
      <td>
        <button
          className="replay-link"
          onClick={() => onSession(sessions[0].id)}
        >
          <Play size={13} />
          Open replay <ArrowUpRight size={13} />
        </button>
      </td>
    </tr>
  );
}
