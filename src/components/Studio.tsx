import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Link2,
  Clock,
  ChevronRight,
  Sparkles,
  Check,
  Copy,
  FileText,
  Braces,
  MousePointer2,
  Server,
  Flag,
  Target,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  db,
  selectGroups,
  detailedSessions,
  filterLabel,
  OUTCOME_LABEL,
  PERIOD_LABEL,
  type Filters,
  type JourneyEvent,
} from "../data";
import {
  investigate,
  QUESTIONS,
  type Finding,
  type Evidence,
} from "../investigator";
import { Phone } from "./Phone";
import { Modal, Empty } from "./Shared";
const kindIcons = {
  Intent: Target,
  Interaction: MousePointer2,
  Application: Braces,
  Backend: Server,
  Outcome: Flag,
};
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
interface Props {
  filters: Filters;
  sessionId: string;
  initialEvent: number;
  seekVersion: number;
  onSession: (id: string, event?: number) => void;
  onJourney: () => void;
  onEvidence: (e: Evidence) => void;
}
export function Studio({
  filters,
  sessionId,
  initialEvent,
  seekVersion,
  onSession,
  onJourney,
  onEvidence,
}: Props) {
  const available = detailedSessions(selectGroups(filters)),
    session = available.find((s) => s.id === sessionId) || available[0];
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(8),
    [question, setQuestion] = useState(0),
    [finding, setFinding] = useState<Finding | null>(null),
    [progress, setProgress] = useState(0),
    [running, setRunning] = useState(false),
    [brief, setBrief] = useState(false),
    [copied, setCopied] = useState(false),
    [kind, setKind] = useState("all");
  const investigatorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setPlaying(false);
    setCursor(
      session
        ? Math.max(
            0,
            (Date.parse(
              session.events[initialEvent]?.at || session.events[0].at,
            ) -
              Date.parse(session.events[0].at)) /
              1000,
          )
        : 0,
    );
  }, [session?.id, initialEvent, seekVersion]);
  useEffect(() => {
    setFinding(null);
    setRunning(false);
    setProgress(0);
  }, [filters.size, filters.payment, filters.outcome, filters.period]);
  const duration = session
    ? (Date.parse(session.events.at(-1)!.at) -
        Date.parse(session.events[0].at)) /
      1000
    : 0;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => setCursor((t) => Math.min(t + speed * 0.25, duration)),
      250,
    );
    return () => clearInterval(id);
  }, [playing, speed, duration]);
  useEffect(() => {
    if (cursor >= duration) setPlaying(false);
  }, [cursor, duration]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setProgress((p) => Math.min(p + 1, 6)), 160);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (progress === 6) setRunning(false);
  }, [progress]);
  if (!session)
    return (
      <div className="page">
        <button className="text-button" onClick={onJourney}>
          <ArrowLeft size={15} />
          Back to journey
        </button>
        <Empty title="No detailed replay matches this cohort">
          Six carefully reconstructed sessions are available in the current
          period. Change the filters in Journey Analysis to explore them.
        </Empty>
      </div>
    );
  const group = db.groups.find((g) => g.id === session.groupId)!,
    participant = db.participants.find((p) => p.id === session.participantId)!,
    order = db.orders.find((o) => o.id === group.orderId)!,
    payments = db.payments.filter((p) => p.groupId === group.id),
    related = db.sessions.filter((s) => s.groupId === group.id && s.detailed);
  const elapsed = (e: JourneyEvent) =>
    (Date.parse(e.at) - Date.parse(session.events[0].at)) / 1000;
  const index = Math.max(
      0,
      session.events.reduce(
        (last, e, i) => (elapsed(e) <= cursor ? i : last),
        0,
      ),
    ),
    event = session.events[index];
  const jump = (n: number) => {
    setPlaying(false);
    setCursor(
      elapsed(
        session.events[Math.max(0, Math.min(n, session.events.length - 1))],
      ),
    );
  };
  const run = () => {
    setFinding(investigate(filters, question, group.id));
    setProgress(0);
    setRunning(true);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(finding!.brief);
      setCopied(true);
    } catch {
      setCopied(false);
      const textarea =
        document.querySelector<HTMLTextAreaElement>("#brief-text");
      textarea?.focus();
      textarea?.select();
    }
  };
  const backendVisible = session.events
    .slice(0, index + 1)
    .filter((e) => e.kind === "Backend" || e.kind === "Outcome")
    .at(-1);
  return (
    <div className="studio-page">
      <div className="studio-title">
        <div>
          <button className="back-link" onClick={onJourney}>
            <ArrowLeft size={13} />
            Journey Analysis
          </button>
          <h1>
            Investigation Studio<span className="title-dot">.</span>
          </h1>
        </div>
        <div className="studio-actions">
          <span
            className={`outcome ${group.outcome === "confirmed" ? "success" : "warning"}`}
          >
            <i />
            {OUTCOME_LABEL[group.outcome]}
          </span>
          <button
            className="button"
            disabled={!finding || running}
            onClick={() => {
              setBrief(true);
              setCopied(false);
            }}
          >
            <FileText size={15} />
            Generate brief
          </button>
        </div>
      </div>
      <div className="context-ribbon">
        <span>
          <span className="status-dot" />
          {filterLabel(filters)}
        </span>
        <span>{PERIOD_LABEL[filters.period]}</span>
        <span className="context-count">
          {selectGroups(filters).length} groups in cohort
        </span>
      </div>
      <div className="studio-workspace">
        <aside className="timeline-panel">
          <div className="workspace-panel-title">
            <span>Journey timeline</span>
            <Link2 size={15} />
          </div>
          <label className="session-selector">
            <span>CONNECTED GROUP</span>
            <select
              aria-label="Replay group"
              value={group.id}
              onChange={(e) =>
                onSession(
                  available.find((s) => s.groupId === e.target.value)!.id,
                )
              }
            >
              {[...new Set(available.map((s) => s.groupId))].map((id) => (
                <option key={id} value={id}>
                  {id} ·{" "}
                  {OUTCOME_LABEL[db.groups.find((g) => g.id === id)!.outcome]}
                </option>
              ))}
            </select>
          </label>
          <div className="participant-selector">
            {related.map((s) => {
              const p = db.participants.find((p) => p.id === s.participantId)!;
              return (
                <button
                  key={s.id}
                  onClick={() => onSession(s.id)}
                  className={session.id === s.id ? "active" : ""}
                  aria-pressed={session.id === s.id}
                >
                  <span className="person-avatar">{p.name[0]}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.role}</small>
                  </span>
                  {session.id === s.id && <span className="status-dot" />}
                </button>
              );
            })}
          </div>
          <div className="timeline-meta">
            <span>{session.id}</span>
            <label>
              <span className="sr-only">Event type</span>
              <select
                aria-label="Event type"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="all">All events</option>
                {Object.keys(kindIcons).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="event-list">
            {session.events.map((e, i) => {
              if (kind !== "all" && e.kind !== kind) return null;
              const Icon = kindIcons[e.kind];
              return (
                <button
                  key={e.id}
                  className={`timeline-event ${index === i ? "active" : ""} ${i < index ? "past" : ""}`}
                  onClick={() => jump(i)}
                  aria-pressed={index === i}
                >
                  <span className={`event-icon kind-${e.kind}`}>
                    <Icon size={13} />
                  </span>
                  <span className="event-content">
                    <span className="event-kind">
                      {e.kind}
                      <time>{time(elapsed(e))}</time>
                    </span>
                    <strong>{e.label}</strong>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="timeline-bottom">
            <Link2 size={15} />
            <p>
              {group.size} participants share one group.
              <br />
              {related.length > 1
                ? "Switch sessions to see the other side."
                : "This group has one detailed replay."}
            </p>
          </div>
        </aside>
        <section className="replay-panel">
          <div className="workspace-panel-title">
            <span>Session reconstruction</span>
            <span className="tiny-label">GATHER · iOS</span>
          </div>
          <div className="replay-stage">
            <div className="replay-meta">
              <span>
                <span className="status-dot" />
                {participant.name} · {participant.role}
              </span>
              <span>Reconstructed UI</span>
            </div>
            <Phone group={group} event={event} participant={participant} />
            <div className="replay-caption">
              <span className={`kind-label kind-${event.kind}`}>
                {event.kind}
              </span>
              <span>{event.label}</span>
            </div>
          </div>
          <div className="player">
            <div className="scrub-marks">
              {session.events.map((e, i) => (
                <button
                  aria-label={`Seek to ${e.label}`}
                  key={e.id}
                  onClick={() => jump(i)}
                  style={{
                    left: `${duration ? (elapsed(e) / duration) * 100 : 0}%`,
                  }}
                  className={i <= index ? "passed" : ""}
                  title={e.label}
                />
              ))}
            </div>
            <input
              aria-label="Replay timeline"
              type="range"
              min="0"
              max={duration}
              step="1"
              value={cursor}
              onChange={(e) => {
                setPlaying(false);
                setCursor(Number(e.target.value));
              }}
            />
            <div className="player-controls">
              <button
                className="icon-button"
                aria-label="Previous event"
                disabled={index === 0}
                onClick={() => jump(index - 1)}
              >
                <SkipBack size={16} />
              </button>
              <button
                className="play-button"
                aria-label={playing ? "Pause replay" : "Play replay"}
                onClick={() => {
                  if (cursor >= duration) setCursor(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                className="icon-button"
                aria-label="Next event"
                disabled={index === session.events.length - 1}
                onClick={() => jump(index + 1)}
              >
                <SkipForward size={16} />
              </button>
              <span className="player-time">
                {time(cursor)} <span>/ {time(duration)}</span>
              </span>
              <select
                aria-label="Playback speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={1}>1×</option>
                <option value={4}>4×</option>
                <option value={8}>8×</option>
              </select>
            </div>
          </div>
          <div className="event-detail">
            <div className="eyebrow">
              SELECTED EVENT{" "}
              <span>
                {new Date(event.at).toLocaleTimeString("en-GB", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </span>
            </div>
            <p>{event.detail}</p>
            <code>{event.id}</code>
          </div>
        </section>
        <aside className="context-panel">
          <div className="workspace-panel-title">
            <span>Business context</span>
            <Server size={15} />
          </div>
          <div className="business-context">
            <div className="context-heading">
              <span className="mono">{group.id}</span>
              <span className="tiny-label">SHARED TRANSACTION</span>
            </div>
            <dl>
              <dt>Order record</dt>
              <dd>
                {order.status === "not_created" ? "Not created" : order.id}
              </dd>
              <dt>Final order status</dt>
              <dd
                className={
                  order.status === "confirmed" ? "text-green" : "text-amber"
                }
              >
                {order.status.replace("_", " ")}
              </dd>
              <dt>Payment outcome</dt>
              <dd>
                {payments.some((p) => p.result === "declined")
                  ? "1 authorization declined"
                  : payments.some((p) => p.result === "authorized")
                    ? `${payments.filter((p) => p.result === "authorized").length} authorized`
                    : "Not attempted"}
              </dd>
              <dt>Experiment</dt>
              <dd>{group.variant}</dd>
              <dt>Release</dt>
              <dd>{group.release}</dd>
            </dl>
            <div className="backend-record">
              <span>BACKEND / OUTCOME AT PLAYHEAD</span>
              <p>{backendVisible?.label || "No backend response yet"}</p>
              <code>{backendVisible?.id || "Awaiting event"}</code>
            </div>
            <details className="business-detail">
              <summary>
                Final business event <ChevronDown size={13} />
              </summary>
              <code>{order.backendEvent}</code>
              <p>
                Final records are shown independently of the replay playhead.{" "}
                {order.confirmedAt
                  ? `Confirmed at ${new Date(order.confirmedAt).toLocaleTimeString("en-GB", { timeZone: "UTC" })} UTC.`
                  : "No order confirmation was recorded."}
              </p>
            </details>
          </div>
          <div className="investigator" ref={investigatorRef}>
            <div className="investigator-title">
              <span className="investigator-symbol">
                <Sparkles size={17} />
              </span>
              <div>
                <h2>Evidence Investigator</h2>
                <span>Grounded in this cohort</span>
              </div>
              <span className="demo-label">DEMO</span>
            </div>
            <label className="investigation-question">
              <span className="sr-only">Investigation question</span>
              <select
                aria-label="Investigation question"
                value={question}
                onChange={(e) => {
                  setQuestion(Number(e.target.value));
                  setFinding(null);
                  setRunning(false);
                  setProgress(0);
                }}
              >
                {QUESTIONS.map((q, i) => (
                  <option key={q} value={i}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <p className="question-display">{QUESTIONS[question]}</p>
            <button
              className="button investigate-button"
              disabled={running}
              onClick={run}
            >
              {running ? (
                <span className="loading-dot" />
              ) : (
                <Sparkles size={14} />
              )}{" "}
              {running
                ? "Examining evidence…"
                : finding
                  ? "Run investigation again"
                  : "Investigate this cohort"}
              <ArrowRight size={14} />
            </button>
            {finding && (
              <div aria-live="polite">
                <details className="analysis-log" open={running}>
                  <summary>
                    {progress} of 6 analysis operations complete
                  </summary>
                  <div className="analysis-trace">
                    {finding.trace.slice(0, progress).map((t) => (
                      <div key={t.label}>
                        <Check size={12} />
                        <span>
                          {t.label}
                          <small>{t.result}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
                {!running && progress === 6 && (
                  <div className="findings">
                    <div className="finding">
                      <h3>
                        <span className="status-dot" />
                        Observed
                      </h3>
                      <p>{finding.observed}</p>
                    </div>
                    <div className="evidence-links">
                      {finding.evidence.map((e, i) => (
                        <button key={i} onClick={() => onEvidence(e)}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          {e.label}
                          <ArrowRight size={12} />
                        </button>
                      ))}
                    </div>
                    <div className="finding">
                      <h3>Possible explanation</h3>
                      <p>{finding.possible}</p>
                    </div>
                    <div className="finding uncertain">
                      <h3>Uncertain</h3>
                      <p>{finding.uncertain}</p>
                    </div>
                    <div className="finding">
                      <h3>Next step</h3>
                      <p>{finding.next}</p>
                    </div>
                    <button
                      className="button full-width"
                      onClick={() => {
                        setBrief(true);
                        setCopied(false);
                      }}
                    >
                      <FileText size={14} />
                      Generate brief
                    </button>
                  </div>
                )}
              </div>
            )}
            {!finding && (
              <div className="investigator-empty">
                <div className="evidence-line">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p>
                  Follow the evidence.
                  <br />
                  Keep the uncertainty.
                </p>
                <small>Metrics → sessions → business outcomes</small>
              </div>
            )}
            <div className="engine-note">
              Deterministic demo engine · no live LLM
            </div>
          </div>
        </aside>
      </div>
      <Modal
        open={brief}
        onClose={() => setBrief(false)}
        title="Your investigation brief"
        description="A concise, copyable record of the evidence and what to do next."
        wide
      >
        <textarea
          id="brief-text"
          className="brief-text"
          aria-label="Investigation brief"
          readOnly
          value={finding?.brief || ""}
        />
        <div className="modal-footer">
          <span>Includes synthetic-data and uncertainty disclosures.</span>
          <button className="button primary" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
            {copied ? "Copied to clipboard" : "Copy brief"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
