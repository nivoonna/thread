import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  GitBranch,
  CalendarDays,
  ChartNoAxesCombined,
  ScanLine,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  db,
  selectGroups,
  metrics,
  pct,
  FOCUS_FILTERS,
  trend,
  PERIOD_LABEL,
} from "../data";
export function Overview({
  onInvestigate,
  onJourney,
}: {
  onInvestigate: () => void;
  onJourney: () => void;
}) {
  const recent = metrics(
      selectGroups({ ...FOCUS_FILTERS, size: "all", payment: "all" }),
    ),
    previous = metrics(
      selectGroups({
        ...FOCUS_FILTERS,
        size: "all",
        payment: "all",
        period: "previous",
      }),
    ),
    focus = metrics(selectGroups(FOCUS_FILTERS)),
    focusPrevious = metrics(
      selectGroups({ ...FOCUS_FILTERS, period: "previous" }),
    );
  const delta = recent.rate - previous.rate,
    focusDelta = focus.rate - focusPrevious.rate;
  const small = metrics(selectGroups({ ...FOCUS_FILTERS, size: "small" }));
  return (
    <div className="page overview">
      <div className="page-title">
        <div>
          <div className="eyebrow">PRODUCT OVERVIEW</div>
          <h1>
            Group Orders<span className="title-dot">.</span>
          </h1>
          <p>Product health and journey intelligence</p>
        </div>
        <span className="date-label">
          <CalendarDays size={15} />
          {PERIOD_LABEL.recent}
          <span className="subtle">vs. previous 14 days</span>
        </span>
      </div>
      <section className="health-section">
        <div className="primary-metric">
          <div className="section-label">
            Group Order completion <span className="small-dot" />
          </div>
          <div className="hero-number">{pct(recent.rate)}</div>
          <div className="metric-change negative">
            <ArrowDownRight size={16} />
            {Math.abs(delta).toFixed(1)} pp <span>vs. previous period</span>
          </div>
          <p>Confirmed orders, not just checkout taps.</p>
        </div>
        <div className="support-metric">
          <span>Groups created</span>
          <strong>{recent.total.toLocaleString()}</strong>
          <small>
            Across{" "}
            {new Set(
              selectGroups({
                ...FOCUS_FILTERS,
                size: "all",
                payment: "all",
              }).flatMap((g) => g.participantIds),
            ).size.toLocaleString()}{" "}
            participants
          </small>
        </div>
        <div className="support-metric">
          <span>Confirmed orders</span>
          <strong>{recent.confirmed.toLocaleString()}</strong>
          <small>Verified by a backend confirmation</small>
        </div>
        <div className="metric-decoration" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            Every interaction.
            <br />
            One connected story.
          </span>
        </div>
      </section>
      <section className="opportunity">
        <div className="opportunity-icon">
          <ScanLine size={24} />
        </div>
        <div className="opportunity-copy">
          <div className="eyebrow">WORTH A CLOSER LOOK</div>
          <h2>Larger groups. More friction at checkout.</h2>
          <p>
            Completion for groups with 4+ participants using split payments is{" "}
            <strong>
              {Math.abs(focusDelta).toFixed(1)} points{" "}
              {focusDelta < 0 ? "lower" : "higher"}
            </strong>{" "}
            than the previous period.
          </p>
          <div className="opportunity-meta">
            <span>{focus.total} groups in this segment</span>
            <span>Multiple possible causes</span>
          </div>
        </div>
        <button className="button primary" onClick={onInvestigate}>
          Investigate drop-off <ArrowRight size={16} />
        </button>
      </section>
      <div className="overview-grid">
        <section className="panel trend-panel">
          <div className="panel-header">
            <div>
              <h2>A shift in completion</h2>
              <p>Daily confirmed orders / groups created</p>
            </div>
            <span className="tiny-label">LAST 14 DAYS</span>
          </div>
          <div className="chart-legend">
            <span>
              <i />
              All groups
            </span>
            <span>
              <i className="dashed" />
              Large groups · split payment
            </span>
          </div>
          <div
            className="trend-chart"
            role="img"
            aria-label="Daily completion trend for all groups and large split-payment groups"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend()}
                margin={{ top: 10, right: 16, bottom: 0, left: -18 }}
              >
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="#e6e9e5"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                  tick={{ fontSize: 11, fill: "#7a817c" }}
                  dy={12}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#7a817c" }}
                />
                <Tooltip
                  formatter={(v, name) => [
                    `${Number(v).toFixed(1)}%`,
                    name === "all" ? "All groups" : "Large · split",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #dce2dc",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={50} stroke="#dde3dd" />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="all"
                  stroke="#367761"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="focus"
                  stroke="#a29b7b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote">
            <span className="small-dot" /> iOS 4.8.0 rollout began Oct 15 ·
            timing alone does not establish causation
          </div>
        </section>
        <section className="panel segment-overview">
          <div className="panel-header">
            <div>
              <h2>The segment behind the shift</h2>
              <p>Split-payment groups · current period</p>
            </div>
            <ChartNoAxesCombined size={18} />
          </div>
          <div className="segment-meter">
            <div>
              <span>2–3 participants</span>
              <strong>{pct(small.rate)}</strong>
            </div>
            <div className="meter-track">
              <i style={{ width: `${small.rate}%` }} />
            </div>
            <small>
              {small.confirmed} of {small.total} groups confirmed
            </small>
          </div>
          <div className="segment-meter">
            <div>
              <span>4+ participants</span>
              <strong>{pct(focus.rate)}</strong>
            </div>
            <div className="meter-track muted">
              <i style={{ width: `${focus.rate}%` }} />
            </div>
            <small>
              {focus.confirmed} of {focus.total} groups confirmed
            </small>
          </div>
          <div className="segment-note">
            Group size is associated with the decline.
            <br />
            The next question is <em>why</em>.
          </div>
          <button className="text-button" onClick={onInvestigate}>
            Explore this comparison <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
      <section className="release-strip">
        <div className="release-icon">
          <GitBranch size={18} />
        </div>
        <div>
          <strong>A little context, not a conclusion.</strong>
          <p>
            iOS 4.8.0 introduced a payment-status treatment. The “Payment
            clarity” experiment is included in linked session records.
          </p>
        </div>
        <button className="text-button" onClick={onJourney}>
          Open journey <ArrowRight size={15} />
        </button>
      </section>
      <footer className="page-footer">
        <span>Fictional marketplace: Gather</span>
        <span>
          {db.groups.length.toLocaleString()} synthetic groups · Oct 1–28, 2026
          · fixed seed
        </span>
      </footer>
    </div>
  );
}
