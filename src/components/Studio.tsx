import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  groupPlayback,
  snapshot,
  journeyEnd,
  participantStatus,
  connectedEvidence,
  utc,
} from "../replay";
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
  moment: number;
  active: boolean;
  record: string;
  onMoment: (moment: number, record?: string) => void;
  onSession: (
    id: string,
    event?: number,
    moment?: number,
    replace?: boolean,
  ) => void;
  onJourney: () => void;
  onEvidence: (e: Evidence) => void;
}
export function Studio({
  filters,
  sessionId,
  moment,
  record,
  active,
  onMoment,
  onSession,
  onJourney,
  onEvidence,
}: Props) {
  const available = detailedSessions(selectGroups(filters)),
    session = available.find((s) => s.id === sessionId);
  const group = session && db.groups.find((g) => g.id === session.groupId);
  const start = group ? Date.parse(group.createdAt) : 0;
  const playhead = moment || start;
  const cursor = Math.max(0, (playhead - start) / 1000);
  const setCursor = (seconds: number) => onMoment(start + seconds * 1000);
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(8),
    [question, setQuestion] = useState(0),
    [finding, setFinding] = useState<Finding | null>(null),
    [progress, setProgress] = useState(0),
    [running, setRunning] = useState(false),
    [brief, setBrief] = useState(false),
    [copied, setCopied] = useState(false),
    [linkCopied, setLinkCopied] = useState(false),
    [kind, setKind] = useState("all");
  const workspaceRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<HTMLElement>(null);
  const [tourIndex, setTourIndex] = useState(-1);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourDelay, setTourDelay] = useState(2000);
  const tour = useMemo(
    () => (group?.id === "GO-1042" ? groupPlayback(group) : []),
    [group?.id],
  );
  const tourStep = tour[tourIndex];
  const stopTour = () => {
    setTourPlaying(false);
    setTourIndex(-1);
  };
  const focusTour = (index: number) => {
    const step = tour[index];
    if (!step) return;
    setPlaying(false);
    setTourIndex(index);
    onSession(step.sessionId, 0, step.at, true);
  };
  const startTour = () => {
    focusTour(0);
    setTourPlaying(true);
    (window.innerWidth > 900
      ? workspaceRef.current
      : replayRef.current
    )?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const manualSession = (id: string, event = 0, at?: number) => {
    stopTour();
    setPlaying(false);
    onSession(id, event, at);
  };
  useEffect(() => {
    stopTour();
  }, [group?.id, active]);
  useEffect(() => {
    if (
      tourStep &&
      (sessionId !== tourStep.sessionId || playhead !== tourStep.at)
    )
      stopTour();
  }, [sessionId, playhead]);
  useEffect(() => {
    if (!tourPlaying || !active || !tourStep) return;
    const timer = setTimeout(() => {
      if (tourIndex >= tour.length - 1) setTourPlaying(false);
      else focusTour(tourIndex + 1);
    }, tourDelay);
    return () => clearTimeout(timer);
  }, [tourIndex, tourPlaying, tourDelay, active]);
  const investigatorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setLinkCopied(false);
  }, [moment, sessionId]);
  useEffect(() => {
    setPlaying(false);
  }, [session?.id, active]);
  useEffect(() => {
    setKind("all");
  }, [session?.id]);
  useEffect(() => {
    if (brief) {
      setTourPlaying(false);
      setPlaying(false);
    }
  }, [brief]);
  useEffect(() => {
    if (!active) setBrief(false);
  }, [active]);
  useEffect(() => {
    setFinding(null);
    setBrief(false);
    setRunning(false);
    setProgress(0);
  }, [
    filters.size,
    filters.payment,
    filters.outcome,
    filters.period,
    group?.id,
  ]);
  const duration = group ? (journeyEnd(group) - start) / 1000 : 0;
  useEffect(() => {
    if (!playing || !active) return;
    const id = setTimeout(
      () => setCursor(Math.min(cursor + speed * 0.25, duration)),
      250,
    );
    return () => clearTimeout(id);
  }, [playing, active, speed, duration, cursor]);
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
  if (!session || !group)
    return (
      <div className="page">
        <button className="text-button" onClick={onJourney}>
          <ArrowLeft size={15} />
          Back to journey
        </button>
        <Empty title="No detailed replay matches this cohort">
          Authored reconstructions cover five curated groups in the recent
          period. This group or selection has no matching recording; aggregate
          records do not imply replay availability. Change the filters in
          Journey Analysis to explore the curated subset.
        </Empty>
      </div>
    );
  const participant = db.participants.find(
      (p) => p.id === session.participantId,
    )!,
    order = db.orders.find((o) => o.id === group.orderId)!,
    payments = db.payments.filter((p) => p.groupId === group.id),
    related = db.sessions.filter((s) => s.groupId === group.id);
  const elapsed = (e: JourneyEvent) => (Date.parse(e.at) - start) / 1000;
  const state = snapshot(session, playhead);
  const selectedIndex = session.events.findIndex(
    (e) => e.id === record && Date.parse(e.at) === playhead,
  );
  const index = selectedIndex >= 0 ? selectedIndex : state.index;
  const event = session.events[index],
    screen = state.screen;
  const records = connectedEvidence(group);
  const payment = payments.find((p) => p.participantId === participant.id)!;
  const jump = (n: number) => {
    stopTour();
    setPlaying(false);
    const e =
      session.events[Math.max(0, Math.min(n, session.events.length - 1))];
    onMoment(Date.parse(e.at), e.id);
  };
  const run = () => {
    setFinding(
      investigate(
        filters,
        question,
        group.id,
        location.origin + location.pathname,
      ),
    );
    setProgress(0);
    setRunning(true);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
    }
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
  const backendVisible = records
    .filter(
      (r) =>
        Date.parse(r.event.at) <= playhead &&
        (r.event.kind === "Backend" || r.event.kind === "Outcome"),
    )
    .at(-1)?.event;
  return (
    <div className="studio-page">
      <div className="studio-title">
        <div>
          <button className="back-link" onClick={onJourney}>
            <ArrowLeft size={13} />
            Explore comparable journeys
          </button>
          <h1>
            Investigation Studio<span className="title-dot">.</span>
          </h1>
        </div>
        <div className="studio-actions">
          <button className="text-button" onClick={copyLink}>
            {linkCopied ? "Replay link copied" : "Copy replay link"}
          </button>
          <span
            className={`outcome ${group.outcome === "confirmed" ? "success" : "warning"}`}
          >
            <i />
            Final group outcome · {OUTCOME_LABEL[group.outcome]}
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
            Create investigation brief
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
          {selectGroups(filters).length} comparable groups · {group.id} is the
          parent investigation
        </span>
      </div>
      <div className="studio-workspace" ref={workspaceRef}>
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
                manualSession(
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
                  onClick={() => manualSession(s.id, 0, playhead)}
                  className={session.id === s.id ? "active" : ""}
                  aria-pressed={session.id === s.id}
                >
                  <span className="person-avatar">{p.name[0]}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.role} ·{" "}
                      {s.detailed ? "Replay available" : "Replay unavailable"}
                    </small>
                    <small>{participantStatus(s, playhead)}</small>
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
          {kind !== "all" && (
            <p className="timeline-filter-note">
              Showing {kind} events plus the selected event. Playback still
              follows all events.
            </p>
          )}
          <div className="event-list">
            {session.events.map((e, i) => {
              if (kind !== "all" && e.kind !== kind && index !== i) return null;
              const Icon = kindIcons[e.kind];
              return (
                <button
                  key={e.id}
                  data-event-id={e.id}
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
                      <time>{utc(e.at)}</time>
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
                ? "Switch people at the same journey moment."
                : "This group has one detailed replay."}
            </p>
          </div>
        </aside>
        <section className="replay-panel" ref={replayRef}>
          <div className="workspace-panel-title">
            <span>Reconstructed customer screen</span>
            <span className="tiny-label">GATHER · iOS</span>
          </div>
          {tour.length > 0 && (
            <div className="group-playback" data-testid="group-playback">
              <div className="group-playback-heading">
                <Users size={16} />
                <strong>The whole group journey</strong>
                <span>{group.size} people · one order</span>
              </div>
              <p>
                {tourStep
                  ? `${tourIndex + 1} / ${tour.length} · ${tourStep.title}`
                  : "Watch from start to finish. Focus switches automatically between all participants."}
              </p>

              <div className="group-playback-actions">
                <button
                  className="button compact primary"
                  onClick={() => {
                    if (tourPlaying) setTourPlaying(false);
                    else if (!tourStep || tourIndex === tour.length - 1)
                      startTour();
                    else setTourPlaying(true);
                  }}
                >
                  {tourPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {tourPlaying
                    ? "Pause group autoplay"
                    : !tourStep
                      ? "Play whole group"
                      : tourIndex === tour.length - 1
                        ? "Replay whole group"
                        : "Resume group autoplay"}
                </button>
                {tourStep && (
                  <button className="text-button" onClick={stopTour}>
                    Inspect manually
                  </button>
                )}
                <label className="tour-pace">
                  <span className="sr-only">Autoplay pace</span>
                  <select
                    aria-label="Autoplay pace"
                    value={tourDelay}
                    onChange={(e) => setTourDelay(Number(e.target.value))}
                  >
                    <option value={4000}>Relaxed · 4s/event</option>
                    <option value={2000}>Standard · 2s/event</option>
                    <option value={1000}>Quick · 1s/event</option>
                  </select>
                </label>
              </div>
              {tourStep && (
                <progress
                  aria-label="Whole group progress"
                  max={tour.length}
                  value={tourIndex + 1}
                />
              )}
              <small>
                {tourStep && tourIndex === tour.length - 1 && !tourPlaying
                  ? "Group journey complete. Review the evidence or create an investigation brief."
                  : "Event-by-event playback · quiet gaps skipped · pause or select a person to inspect."}
              </small>
            </div>
          )}
          <div className="player" hidden={!!tourStep}>
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
                stopTour();
                setPlaying(false);
                setCursor(Number(e.target.value));
              }}
            />
            <div className="player-controls">
              <button
                className="icon-button"
                title="Previous event"
                aria-label="Previous event"
                disabled={index <= 0}
                onClick={() => jump(index - 1)}
              >
                <SkipBack size={16} />
              </button>
              <button
                className="play-button"
                title={playing || tourPlaying ? "Pause replay" : "Play replay"}
                aria-label={
                  playing || tourPlaying ? "Pause replay" : "Play replay"
                }
                onClick={() => {
                  if (tourStep) {
                    if (tourIndex === tour.length - 1) startTour();
                    else setTourPlaying(!tourPlaying);
                    return;
                  }
                  if (cursor >= duration) setCursor(0);
                  setPlaying(!playing);
                }}
              >
                {playing || tourPlaying ? (
                  <Pause size={17} />
                ) : (
                  <Play size={17} />
                )}
              </button>
              <button
                className="icon-button"
                title="Next event"
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
                disabled={!!tourStep}
                title={
                  tourStep
                    ? "Use Autoplay pace for the group journey"
                    : "Playback speed"
                }
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
          <div className="replay-stage">
            <div className="replay-meta">
              <span>
                <span className="status-dot" />
                {participant.name} · {participant.role}
              </span>
              <span>Authored synthetic fixture</span>
            </div>
            <div className="reconstruction-time" data-testid="journey-clock">
              Journey time · {utc(playhead)}
            </div>
            {screen ? (
              <Phone
                group={group}
                event={screen}
                participant={participant}
                moment={playhead}
              />
            ) : (
              <Empty title={state.boundary}>
                Choose a later journey moment to inspect this person’s screen.
              </Empty>
            )}
            <div className="reconstruction-note">
              {state.boundary}
              {screen && <> Recorded at {utc(screen.at)}.</>}
            </div>
            <details className="reconstruction-details">
              <summary>Reconstruction details</summary>
              <p>
                {group.release} · authored Gather screen:{" "}
                {screen?.screen || "unavailable"}. No captured recording or
                component-version metadata.
              </p>
            </details>
            <div className="replay-caption">
              <span
                className={`kind-label kind-${event?.kind || "Application"}`}
              >
                {event?.kind}
              </span>
              <span>{event?.label || "No event at this time"}</span>
            </div>
          </div>
          <div className="event-detail">
            <div className="eyebrow">
              SELECTED EVENT{" "}
              <span>
                {new Date(event?.at || playhead).toLocaleTimeString("en-GB", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </span>
            </div>
            <p>{tourStep?.detail || event?.detail || state.boundary}</p>
            <code>{event?.id || session.id}</code>
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
              <dt>Final group payments</dt>
              <dd>
                {payments.some((p) => p.result === "declined")
                  ? "1 authorization declined"
                  : payments.some((p) => p.result === "authorized")
                    ? `${payments.filter((p) => p.result === "authorized").length} authorized`
                    : "Not attempted"}
              </dd>
              <dt>Selected person</dt>
              <dd>
                {participant.name} · {participant.role}
              </dd>
              <dt>Person at playhead</dt>
              <dd>{participantStatus(session, playhead)}</dd>
              <dt>Payment record</dt>
              <dd>{payment.id}</dd>
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
          <details className="connected-evidence">
            <summary>Connected evidence · {participant.name}</summary>
            <p>
              Authored synthetic records linked by group, session and
              participant IDs. Future events are marked; rendered screens are
              separate application records.
            </p>
            {records
              .filter(
                (r) =>
                  r.session.id === session.id ||
                  r.event.label === "Submission blocked" ||
                  r.event.label === "Tap Place order",
              )
              .map((r) => (
                <button
                  key={r.event.id}
                  className="evidence-record"
                  onClick={() =>
                    manualSession(
                      r.session.id,
                      r.session.events.findIndex((e) => e.id === r.event.id),
                    )
                  }
                >
                  <strong>{r.event.label}</strong>
                  <span>
                    {r.source} · {r.event.kind} · {utc(r.event.at)}
                    {Date.parse(r.event.at) > playhead
                      ? " · after playhead"
                      : ""}
                  </span>
                  <code>
                    {r.event.id}
                    <br />
                    {r.participant.id} · {r.session.id}
                    <br />
                    {group.id} → {order.id}
                    {r.source === "payment" ||
                    /authorization/.test(r.event.label)
                      ? ` → ${r.payment.id}`
                      : ""}
                  </code>
                </button>
              ))}
            <p>
              Final outcome:{" "}
              {order.confirmedAt
                ? `confirmed at ${utc(order.confirmedAt)}`
                : "No order confirmation recorded"}
              . Absence is a final-record observation, not a screen event.
            </p>
          </details>
          <div className="investigator" ref={investigatorRef}>
            <div className="investigator-title">
              <span className="investigator-symbol">
                <Sparkles size={17} />
              </span>
              <div>
                <h2>Evidence Investigator</h2>
                <span>This order + comparable cohort</span>
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
                  : "Investigate this journey"}
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
                        Observed evidence
                      </h3>
                      <p>{finding.observed}</p>
                    </div>
                    <div className="finding">
                      <h3>Business outcome and scope</h3>
                      <p>{finding.business}</p>
                    </div>
                    <div className="evidence-links">
                      {finding.evidence.map((e, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            stopTour();
                            onEvidence(e);
                          }}
                        >
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          {e.label}
                          <ArrowRight size={12} />
                        </button>
                      ))}
                    </div>
                    <div className="finding">
                      <h3>Hypothesis</h3>
                      <p>{finding.possible}</p>
                    </div>
                    <div className="finding uncertain">
                      <h3>Missing evidence</h3>
                      <p>{finding.uncertain}</p>
                    </div>
                    <div className="finding">
                      <h3>Recommended validation</h3>
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
                      Create investigation brief
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
        description="A decision recommendation, supporting evidence, proposed validation owners and measurable guardrails."
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
