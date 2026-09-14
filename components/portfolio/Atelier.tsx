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
import { themes } from "@/lib/visual/latent-graph";
import SignalField from "./SignalField";
import StudioSound from "./StudioSound";
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
  const [identityArrived, setIdentityArrived] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setIdentityArrived(true),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1800,
    );
    return () => clearTimeout(timer);
  }, []);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const [Room, setRoom] = useState<ComponentType<RoomProps> | null>(null);
  const [view, setView] = useState<View>("home"),
    [hovered, setHovered] = useState<Station | null>(null),
    [settled, setSettled] = useState<View | null>(null);
  const pointer = useRef<[number, number]>([0, 0]);
  const interacting = useRef(false);
  const [projectDestination, setProjectDestination] = useState<string | undefined>();
  const [reveal, setReveal] = useState(false);
  const [mobile, setMobile] = useState(false),
    [economy, setEconomy] = useState(false),
    [reduced, setReduced] = useState(true),
    [visible, setVisible] = useState(true),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const panel = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    origin = useRef<HTMLElement | null>(null),
    originView = useRef<View>("home"),
    current = useRef<View>("home");
  const [exitingProjects, setExitingProjects] = useState(false);
  useEffect(() => {
    if(!exitingProjects) return;
    const timer = setTimeout(() => setExitingProjects(false), 240);
    return () => clearTimeout(timer);
  }, [exitingProjects]);
  const change = useCallback((next: View) => {
    setExitingProjects(current.current === "projects" && next === "home" && !matchMedia("(prefers-reduced-motion: reduce)").matches);
    current.current = next;
    setNavigationVersion((value) => value + 1);
    setView(next);
    setSettled(null);
    setHovered(null);
    pointer.current = [0, 0];
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
                originView.current === "field" ? "#field-entry" : `#destination-nav a[href="#${originView.current}"]`,
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
    let initialSync = true;
    const sync = () => {
      const next = viewFromHash(location.hash);
      if(next !== current.current) change(next);
      if(next === "home" && !initialSync) requestAnimationFrame(() => document.querySelector<HTMLElement>(originView.current === "field" ? "#field-entry" : `#destination-nav a[href="#${originView.current}"]`)?.focus({preventScroll:true}));
      initialSync = false;
    };
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
  const displayView = exitingProjects && view === "home" ? "projects" : view;
  return (
    <main
      id="main"
      className={`atelier ${view === "home" ? "room-view" : "station-focused"} ${ready ? "room-ready" : ""}  ${identityArrived ? "identity-arrived" : "identity-entering"}`}
      data-station={view}
      data-field-ready={view === "field" && panelReady}
      onPointerMove={(event) => {
        if (
          view === "home" &&
          !mobile &&
          !reduced &&
          event.pointerType === "mouse"
        )
          pointer.current = [
            event.clientX / innerWidth - 0.5,
            event.clientY / innerHeight - 0.5,
          ];
      }}
      onPointerLeave={() => { pointer.current = [0, 0]; interacting.current = false; }}
      onPointerDown={() => { interacting.current = true; }}
      onPointerUp={() => { interacting.current = false; }}
      onPointerCancel={() => { interacting.current = false; }}
      data-visible={visible}
      data-project-attention={hovered === "projects"}
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
              interacting={interacting}
              reveal={reveal}
              mobile={mobile}
              economy={economy}
              reduced={reduced}
              visible={visible && !(view === "field" && panelReady)}
              onReady={onReady}
              onFailure={onFailure}
            />
          </Suspense>
        </RoomBoundary>
      )}
      <div className="room-vignette" aria-hidden="true" />
      <StudioSound view={view} visible={visible} />
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
          <span>The latent studio</span>
        </a>
        <nav id="destination-nav" aria-label="Main navigation">
          {(["home", "projects", "career", "cv"] as (Station | "home")[]).map((item) => (
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
              <span className="chapter-number">0{["home", "projects", "career", "cv"].indexOf(item)} / </span>{item === "cv" ? "CV" : item[0].toUpperCase() + item.slice(1)}
            </a>
          ))}
          <a href="mailto:sarseej.shrestha@selu.edu"><span className="chapter-number">04 / </span>Contact ↗</a>
        </nav>
      </header>
      {view === "home" && (
        <>
          <section className="entrance-copy">
            <h1 className="opening-identity">Sarseej Shrestha</h1>
            <p className="overline">Computer Science · AI/ML · Systems</p>
            <span className="studio-caption">THE LATENT STUDIO <span> / </span> BLUE HOUR</span>
          </section>
          <footer className="workspace-footer">
            <button className="reveal-control" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>{reveal ? "Hide structure" : "Reveal structure"} <span aria-hidden="true">{reveal ? "−" : "+"}</span></button>
            <button className="field-entry" id="field-entry" onClick={(event)=>navigate("field",event.currentTarget)}>EXPLORE THE FIELD ↗</button>
            {reveal && <div className="structure-key"><p>Connections trace repository-supported concepts.</p>{themes.map((theme, i) => <span className="cluster-label" key={theme.name}>0{i+1} / {theme.name}</span>)}</div>}
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
      {view === "field" && <SignalField ready={panelReady} onBack={()=>navigate("home")} onProject={(id)=>{setProjectDestination(id);navigate("projects");}}/>}
      {displayView !== "home" && displayView !== "field" && (
        <section
          ref={panel}
          className={`object-interface interface-${displayView} ${panelReady || exitingProjects ? "is-ready" : ""} ${exitingProjects ? "is-exiting" : ""} ${!ready || failed ? "fallback-interface" : ""}`}
          aria-labelledby="interface-title"
          aria-hidden={!panelReady}
          style={!panelReady && !exitingProjects ? { visibility: "hidden" } : undefined}
        >
          <div className="interface-toolbar">
            <button onClick={() => navigate("home")} aria-label="Back to room">
              ← Back
            </button>
            <h1 id="interface-title" ref={heading} tabIndex={-1}>
              {displayView === "cv"
                ? "CV"
                : displayView === "projects"
                  ? "Projects"
                  : "Career"}
            </h1>
            <span>
              {displayView === "projects" ? (
                "01 / SELECTED WORK"
              ) : displayView === "career" ? (
                "Trace mode · The path so far"
              ) : (
                <Link href="/resume">Print-friendly view ↗</Link>
              )}
            </span>
          </div>
          <div className="interface-content" key={displayView}>
            {displayView === "projects" ? (
              <ProjectWorkspace initialProject={projectDestination} />
            ) : displayView === "career" ? (
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
