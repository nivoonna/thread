import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Route,
  ScanLine,
  ChevronRight,
  Info,
  ArrowUpRight,
  Command,
  Link2,
} from "lucide-react";
import { Overview } from "./components/Overview";
import { Journey } from "./components/Journey";
import { Studio } from "./components/Studio";
import { Architecture, ThreadMark } from "./components/Shared";
import {
  DEFAULT_FILTERS,
  FOCUS_FILTERS,
  db,
  SEGMENTS,
  type Filters,
} from "./data";
import type { Evidence } from "./investigator";
type Page = "overview" | "journey" | "studio";
interface RouteState {
  page: Page;
  filters: Filters;
  sessionId: string;
  event: number;
  moment: number;
  record: string;
  origin: string;
  stage: number;
  compare: boolean;
  cohortA: string;
  cohortB: string;
  mode: "reached" | "abandoned";
}
function legacyMoment(p: URLSearchParams) {
  const s = db.sessions.find((s) => s.id === (p.get("session") || "S-1042-0"));
  if (!s?.detailed) return 0;
  const legacy: Record<string, number[]> = {
    "S-1042-0": [0, 12, 25, 44, 70, 100, 102, 145],
    "S-1042-1": [30, 55, 76, 96, 97, 98, 145],
    "S-1096-0": [0, 12, 25, 44, 70, 110, 150],
    "S-1128-0": [0, 12, 25, 44, 70, 80, 95, 108, 140],
    "S-1186-0": [0, 12, 25, 44, 70, 100, 115, 120],
    "S-1234-0": [0, 12, 25, 44, 70, 100, 115, 120],
  };
  const seconds = legacy[s.id]?.[Number(p.get("event")) || 0];
  return seconds !== undefined
    ? Date.parse(db.groups.find((g) => g.id === s.groupId)!.createdAt) +
        seconds * 1000
    : Date.parse(s.events[0].at);
}
function readRoute(): RouteState {
  const p = new URLSearchParams(location.hash.replace(/^#/, ""));
  const valid = <T extends string>(
    key: string,
    values: readonly T[],
    fallback: T,
  ): T => (values.includes(p.get(key) as T) ? (p.get(key) as T) : fallback);
  return {
    page: valid("page", ["overview", "journey", "studio"], "overview"),
    filters: {
      size: valid("size", ["all", "small", "large"], "all"),
      payment: valid("payment", ["all", "single", "split"], "all"),
      outcome: valid("outcome", ["all", "completed", "abandoned"], "all"),
      period: valid("period", ["recent", "previous", "all"], "recent"),
    },
    sessionId: p.get("session") || "S-1042-0",
    event: Math.max(0, Number(p.get("event")) || 0),
    moment:
      Number.isFinite(Number(p.get("moment"))) &&
      Number(p.get("moment")) > 0 &&
      Number(p.get("moment")) < 8640000000000000
        ? Number(p.get("moment"))
        : legacyMoment(p),
    origin: p.get("origin") || "",
    record: p.get("record") || "",
    stage: Math.min(
      6,
      Math.max(
        0,
        Number.isFinite(Number(p.get("stage") ?? 5))
          ? Math.floor(Number(p.get("stage") ?? 5))
          : 5,
      ),
    ),
    compare: p.get("compare") === "true",
    cohortA: valid(
      "cohortA",
      SEGMENTS.map((s) => s.id),
      "large-split",
    ),
    cohortB: valid(
      "cohortB",
      SEGMENTS.map((s) => s.id),
      "small-split",
    ),
    mode:
      p.get("stage") === "6"
        ? "reached"
        : valid("mode", ["reached", "abandoned"], "abandoned"),
  };
}
export default function App() {
  const [route, setRoute] = useState<RouteState>(readRoute),
    [architecture, setArchitecture] = useState(false);
  useEffect(() => {
    const fn = () => setRoute(readRoute());
    window.addEventListener("popstate", fn);
    window.addEventListener("hashchange", fn);
    return () => {
      window.removeEventListener("popstate", fn);
      window.removeEventListener("hashchange", fn);
    };
  }, []);
  function navigate(change: Partial<RouteState>, replace = false) {
    const next = { ...route, ...change };
    setRoute(next);
    const params = new URLSearchParams({
      page: next.page,
      ...next.filters,
      session: next.sessionId,
      event: String(next.event),
      moment: String(next.moment),
      record: next.record,
      origin: next.origin,
      stage: String(next.stage),
      compare: String(next.compare),
      cohortA: next.cohortA,
      cohortB: next.cohortB,
      mode: next.mode,
    });
    history[replace ? "replaceState" : "pushState"](null, "", `#${params}`);
    if (change.page && change.page !== route.page) window.scrollTo({ top: 0 });
  }
  const onSession = (
    id: string,
    event = 0,
    moment?: number,
    replace = false,
  ) => {
    navigate(
      {
        page: "studio",
        sessionId: id,
        event,
        record:
          moment === undefined
            ? db.sessions.find((s) => s.id === id)?.events[event]?.id || ""
            : "",
        moment:
          moment ??
          (Date.parse(
            db.sessions.find((s) => s.id === id)?.events[event]?.at || "",
          ) ||
            0),
      },
      replace,
    );
  };
  const remember = () =>
    JSON.stringify({
      sessionId: route.sessionId,
      moment: route.moment,
      record: route.record,
      filters: route.filters,
    });
  const returnToOrigin = () => {
    try {
      const origin = JSON.parse(route.origin);
      if (
        !db.sessions.some((s) => s.id === origin.sessionId) ||
        !origin.filters ||
        !Number.isFinite(origin.moment) ||
        origin.moment <= 0 ||
        origin.moment >= 8640000000000000 ||
        !["all", "small", "large"].includes(origin.filters.size) ||
        !["all", "split", "single"].includes(origin.filters.payment) ||
        !["all", "completed", "abandoned"].includes(origin.filters.outcome) ||
        !["all", "recent", "previous"].includes(origin.filters.period)
      )
        throw new Error("Invalid origin");
      navigate({
        page: "studio",
        sessionId: origin.sessionId,
        moment: origin.moment,
        record: typeof origin.record === "string" ? origin.record : "",
        filters: origin.filters,
      });
    } catch {
      navigate({ page: "studio" });
    }
  };
  const onEvidence = (e: Evidence) => {
    if (e.type === "funnel")
      navigate({
        page: "journey",
        stage: e.stage ?? 5,
        mode: "abandoned",
        origin: remember(),
      });
    if (e.type === "comparison")
      navigate({ page: "journey", compare: true, origin: remember() });
    if (e.sessionId) {
      const session = db.sessions.find((s) => s.id === e.sessionId)!;
      onSession(
        e.sessionId,
        Math.max(
          0,
          session.events.findIndex((x) => x.id === e.eventId),
        ),
      );
    }
  };
  const titles = {
    overview: "Product overview",
    journey: "Journey analysis",
    studio: "Investigation studio",
  };
  return (
    <div
      className={`app-shell ${route.page === "studio" ? "studio-shell" : ""}`}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href="#page=overview"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate({ page: "overview" });
          }}
        >
          <ThreadMark />
          <span>
            THREAD<small>JOURNEY INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace-name">
          <span className="workspace-icon">
            g<span>✳</span>
          </span>
          <div>
            <strong>Gather</strong>
            <small>Product workspace</small>
          </div>
          <span className="workspace-badge">DEMO</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              { page: "overview", label: "Overview", Icon: LayoutDashboard },
              { page: "journey", label: "Journey Analysis", Icon: Route },
              { page: "studio", label: "Investigation Studio", Icon: ScanLine },
            ] as const
          ).map(({ page, label, Icon }) => (
            <button
              key={page}
              aria-label={label}
              title={label}
              className={route.page === page ? "active" : ""}
              onClick={() => navigate({ page })}
              aria-current={route.page === page ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
              {route.page === page && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-connection">
          <div className="thread-illustration" aria-hidden="true">
            <i />
            <i />
            <i />
            <span />
            <span />
            <span />
          </div>
          <h3>
            The whole story,
            <br />
            connected.
          </h3>
          <p>
            From what people experience
            <br />
            to what actually happens.
          </p>
          <button onClick={() => setArchitecture(true)}>
            How THREAD works <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">PM</span>
          <div>
            <strong>Your workspace</strong>
            <small>Explore the demo</small>
          </div>
          <Command size={15} />
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <span>Group Orders</span>
            <ChevronRight size={13} />
            <strong>{titles[route.page]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="synthetic-badge">
              <span className="status-dot" />
              Synthetic data
            </span>
            <button
              className="icon-button"
              title="How THREAD works"
              aria-label="How THREAD works"
              onClick={() => setArchitecture(true)}
            >
              <Info size={17} />
            </button>
            <span className="header-avatar">PM</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div hidden={route.page !== "overview"}>
            <Overview
              onInvestigate={() =>
                navigate({
                  page: "studio",
                  sessionId: "S-1042-0",
                  record: "",
                  moment: Date.parse("2026-10-22T12:31:38Z"),
                  filters: FOCUS_FILTERS,
                  stage: 5,
                  mode: "abandoned",
                  compare: false,
                })
              }
              onCompare={() =>
                navigate({
                  page: "journey",
                  filters: FOCUS_FILTERS,
                  compare: true,
                  cohortA: "large-split",
                  cohortB: "small-split",
                })
              }
              onJourney={() =>
                navigate({ page: "journey", filters: DEFAULT_FILTERS })
              }
            />
          </div>
          <div hidden={route.page !== "journey"}>
            {route.origin && (
              <button className="button return-origin" onClick={returnToOrigin}>
                Return to originating order and moment
              </button>
            )}
            <Journey
              filters={route.filters}
              setFilters={(filters) => navigate({ filters }, true)}
              stage={route.stage}
              setStage={(stage) =>
                navigate(
                  { stage, mode: stage === 6 ? "reached" : route.mode },
                  true,
                )
              }
              mode={route.mode}
              setMode={(mode) => navigate({ mode }, true)}
              onSession={onSession}
              a={route.cohortA}
              b={route.cohortB}
              setA={(cohortA) => navigate({ cohortA }, true)}
              setB={(cohortB) => navigate({ cohortB }, true)}
              compare={route.compare}
              setCompare={(compare) => navigate({ compare }, true)}
            />
          </div>
          <div hidden={route.page !== "studio"}>
            <Studio
              filters={route.filters}
              sessionId={route.sessionId}
              moment={route.moment}
              active={route.page === "studio"}
              record={route.record}
              onMoment={(moment, record = "") =>
                navigate({ moment, record }, true)
              }
              onSession={onSession}
              onJourney={() =>
                navigate({
                  page: "journey",
                  origin: remember(),
                  stage: 0,
                  mode: "reached",
                })
              }
              onEvidence={onEvidence}
            />
          </div>
        </main>
        <div className="app-bottom">
          <span>
            <Link2 size={12} />
            Experience meets outcome.
          </span>
          <span>THREAD / Independent product concept</span>
        </div>
      </div>
      <Architecture
        open={architecture}
        onClose={() => setArchitecture(false)}
      />
    </div>
  );
}
