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
import { DEFAULT_FILTERS, FOCUS_FILTERS, db, type Filters } from "./data";
import type { Evidence } from "./investigator";
type Page = "overview" | "journey" | "studio";
interface RouteState {
  page: Page;
  filters: Filters;
  sessionId: string;
  event: number;
  stage: number;
  compare: boolean;
  mode: "reached" | "abandoned";
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
    mode:
      p.get("stage") === "6"
        ? "reached"
        : valid("mode", ["reached", "abandoned"], "abandoned"),
  };
}
export default function App() {
  const [route, setRoute] = useState<RouteState>(readRoute),
    [architecture, setArchitecture] = useState(false),
    [seekVersion, setSeekVersion] = useState(0);
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
      stage: String(next.stage),
      compare: String(next.compare),
      mode: next.mode,
    });
    history[replace ? "replaceState" : "pushState"](null, "", `#${params}`);
    if (change.page && change.page !== route.page) window.scrollTo({ top: 0 });
  }
  const onSession = (id: string, event = 0) => {
    setSeekVersion((v) => v + 1);
    navigate({ page: "studio", sessionId: id, event });
  };
  const onEvidence = (e: Evidence) => {
    if (e.type === "funnel")
      navigate({ page: "journey", stage: e.stage ?? 5, mode: "abandoned" });
    if (e.type === "comparison") navigate({ page: "journey", compare: true });
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
              aria-label="How THREAD works"
              onClick={() => setArchitecture(true)}
            >
              <Info size={17} />
            </button>
            <span className="header-avatar">PM</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {route.page === "overview" ? (
            <Overview
              onInvestigate={() =>
                navigate({
                  page: "journey",
                  filters: FOCUS_FILTERS,
                  stage: 5,
                  mode: "abandoned",
                  compare: false,
                })
              }
              onJourney={() =>
                navigate({ page: "journey", filters: DEFAULT_FILTERS })
              }
            />
          ) : route.page === "journey" ? (
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
              compare={route.compare}
              setCompare={(compare) => navigate({ compare }, true)}
            />
          ) : (
            <Studio
              filters={route.filters}
              sessionId={route.sessionId}
              initialEvent={route.event}
              seekVersion={seekVersion}
              onSession={onSession}
              onJourney={() => navigate({ page: "journey" })}
              onEvidence={onEvidence}
            />
          )}
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
