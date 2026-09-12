"use client";

import Link from "next/link";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  stations,
  viewFromHash,
  type RoomProps,
  type Station,
  type View,
  type ScreenBounds,
} from "./atelier-types";
import StudioPoster from "./StudioPoster";
import ProjectWorkspace from "./ProjectWorkspace";
import CareerTimeline from "./CareerTimeline";
import CVDocument from "./CVDocument";
class RoomBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function Atelier() {
  const [navigationVersion, setNavigationVersion] = useState(0);
  const [Room, setRoom] = useState<ComponentType<RoomProps> | null>(null);
  const [view, setView] = useState<View>("home"),
    [hovered, setHovered] = useState<Station | null>(null),
    [settled, setSettled] = useState<View | null>(null);
  const [pointer, setPointer] = useState<[number, number]>([0, 0]);
  const [mobile, setMobile] = useState(false),
    [economy, setEconomy] = useState(false),
    [reduced, setReduced] = useState(true),
    [visible, setVisible] = useState(true),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [exploring, setExploring] = useState(false);
  const panel = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    origin = useRef<HTMLElement | null>(null),
    originView = useRef<View>("home"),
    current = useRef<View>("home");
  const change = useCallback((next: View) => {
    current.current = next;
    setNavigationVersion((value) => value + 1);
    setView(next);
    setSettled(null);
    setHovered(null);
    setPointer([0, 0]);
  }, []);
  const navigate = useCallback(
    (next: View, source?: HTMLElement) => {
      if (next === current.current) return;
      if (current.current === "home") {
        origin.current = source || (document.activeElement as HTMLElement);
        originView.current = next;
      }
      history.pushState(null, "", next === "home" ? "#home" : `#${next}`);
      change(next);
      if (next === "home")
        requestAnimationFrame(() =>
          (origin.current?.isConnected
            ? origin.current
            : document.querySelector<HTMLElement>(
                `#destination-nav a[href="#${originView.current}"]`,
              )
          )?.focus({ preventScroll: true }),
        );
    },
    [change],
  );
  const onReady = useCallback(() => setReady(true), []),
    onFailure = useCallback(() => {
      setFailed(true);
      setReady(false);
    }, []);
  const onSettled = useCallback((next: View) => {
    if (current.current === next) setSettled(next);
  }, []);
  const onScreenBounds = useCallback((bounds: ScreenBounds) => {
    if (panel.current)
      for (const [key, value] of Object.entries(bounds))
        panel.current.style.setProperty(`--screen-${key}`, `${value}px`);
  }, []);
  useEffect(() => {
    const sync = () => change(viewFromHash(location.hash));
    sync();
    addEventListener("popstate", sync);
    addEventListener("hashchange", sync);
    return () => {
      removeEventListener("popstate", sync);
      removeEventListener("hashchange", sync);
    };
  }, [change]);
  useEffect(() => {
    const width = matchMedia("(max-width: 700px)"),
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const device = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
      };
      setMobile(width.matches);
      setEconomy(
        width.matches ||
          device.hardwareConcurrency <= 4 ||
          (device.deviceMemory !== undefined && device.deviceMemory <= 4) ||
          !!device.connection?.saveData,
      );
      setReduced(motion.matches);
    };
    const visibility = () => setVisible(!document.hidden);
    update();
    visibility();
    width.addEventListener("change", update);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    let cancelled = false;
    if ("WebGL2RenderingContext" in window)
      import("./AtelierRoom")
        .then((module) => {
          if (!cancelled) setRoom(() => module.default);
        })
        .catch(onFailure);
    else onFailure();
    return () => {
      cancelled = true;
      width.removeEventListener("change", update);
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [onFailure]);
  const panelReady = view !== "home" && (!ready || failed || settled === view);
  useEffect(() => {
    if (panelReady) heading.current?.focus({ preventScroll: true });
  }, [panelReady, view]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && current.current !== "home")
        navigate("home");
    };
    addEventListener("keydown", escape);
    return () => removeEventListener("keydown", escape);
  }, [navigate]);
  return (
    <main
      id="main"
      className={`atelier ${view === "home" ? "room-view" : "station-focused"} ${ready ? "room-ready" : ""} ${exploring ? "is-exploring" : ""}`}
      data-station={view}
      onPointerMove={(event) => {
        if (
          view === "home" &&
          !mobile &&
          !reduced &&
          event.pointerType === "mouse"
        )
          setPointer([
            event.clientX / innerWidth - 0.5,
            event.clientY / innerHeight - 0.5,
          ]);
      }}
      onPointerLeave={() => setPointer([0, 0])}
    >
      <a className="skip-link" href="#destination-nav">
        Skip to navigation
      </a>
      <div className="room-backdrop" aria-hidden="true">
        <StudioPoster />
      </div>
      {!failed && Room && (
        <RoomBoundary onFailure={onFailure}>
          <Suspense fallback={null}>
            <Room
              navigationVersion={navigationVersion}
              station={view}
              hovered={hovered}
              onSelect={(next) => navigate(next)}
              onHover={setHovered}
              onSettled={onSettled}
              onScreenBounds={onScreenBounds}
              pointer={pointer}
              mobile={mobile}
              economy={economy}
              reduced={reduced}
              visible={visible}
              onReady={onReady}
              onFailure={onFailure}
            />
          </Suspense>
        </RoomBoundary>
      )}
      <div className="room-vignette" aria-hidden="true" />
      <header className="atelier-header">
        <a
          className="identity"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            navigate("home");
          }}
        >
          <strong>Sarseej Shrestha</strong>
          <span>AI/ML Developer · Computer Science Student</span>
        </a>
        <nav id="destination-nav" aria-label="Main navigation">
          {(["home", "projects", "career", "cv"] as View[]).map((item) => (
            <a
              key={item}
              href={`#${item}`}
              aria-current={view === item ? "page" : undefined}
              onMouseEnter={() => setHovered(item === "home" ? null : item)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(item === "home" ? null : item)}
              onBlur={() => setHovered(null)}
              onKeyDown={(event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  navigate(item, event.currentTarget);
                }
              }}
              onClick={(event) => {
                event.preventDefault();
                navigate(item, event.currentTarget);
              }}
            >
              {item === "cv" ? "CV" : item[0].toUpperCase() + item.slice(1)}
            </a>
          ))}
          <a href="mailto:sarseej.shrestha@selu.edu">Contact ↗</a>
        </nav>
      </header>
      {view === "home" && (
        <>
          <section className="entrance-copy">
            <p className="overline">A workspace for ideas that hold up</p>
            <h1>
              I build intelligent systems—and study what makes them trustworthy.
            </h1>
            <p>
              Applied AI, thoughtful software, and the questions behind them.
            </p>
            <div className="entrance-actions">
              <button
                onClick={() => {
                  setExploring(true);
                  document
                    .querySelector<HTMLButtonElement>(".station-marker")
                    ?.focus();
                }}
              >
                Explore workspace <span>↗</span>
              </button>
              <a
                href="#projects"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("projects", event.currentTarget);
                }}
              >
                View Projects
              </a>
              <a
                href="https://github.com/sarseej-shrestha"
                target="_blank"
                rel="noreferrer"
              >
                GitHub ↗
              </a>
            </div>
          </section>
          <footer className="workspace-footer">
            <p>Choose a destination or select an object.</p>
            <div className="station-controls">
              {stations.map((item) => (
                <button
                  key={item.id}
                  onFocus={() => setHovered(item.id)}
                  onBlur={() => setHovered(null)}
                  onPointerEnter={() => setHovered(item.id)}
                  onPointerLeave={() => setHovered(null)}
                  onClick={(event) => navigate(item.id, event.currentTarget)}
                >
                  <span>{item.number}</span> {item.label}
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>
            <span className="render-status">
              {failed
                ? "Static workspace · All destinations available"
                : ready
                  ? "Southeastern Louisiana University · B.S. expected May 2027"
                  : "Preparing workspace · Content available now"}
            </span>
          </footer>
        </>
      )}
      {view !== "home" && (
        <section
          ref={panel}
          className={`object-interface interface-${view} ${panelReady ? "is-ready" : ""} ${!ready || failed ? "fallback-interface" : ""}`}
          aria-labelledby="interface-title"
          aria-hidden={!panelReady}
          style={!panelReady ? { visibility: "hidden" } : undefined}
        >
          <div className="interface-toolbar">
            <button onClick={() => navigate("home")} aria-label="Back to room">
              ← Back
            </button>
            <h1 id="interface-title" ref={heading} tabIndex={-1}>
              {view === "cv"
                ? "CV"
                : view === "projects"
                  ? "Projects"
                  : "Career"}
            </h1>
            <span>
              {view === "projects" ? (
                "A body of engineering work"
              ) : view === "career" ? (
                "The path so far"
              ) : (
                <Link href="/resume">Print-friendly view ↗</Link>
              )}
            </span>
          </div>
          <div className="interface-content" key={view}>
            {view === "projects" ? (
              <ProjectWorkspace />
            ) : view === "career" ? (
              <CareerTimeline />
            ) : (
              <CVDocument />
            )}
          </div>
        </section>
      )}
    </main>
  );
}
