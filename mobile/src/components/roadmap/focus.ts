import { buildJourney, type JourneyPath } from "./journey";
import type { Module0Summary } from "../../types/clinicalReadiness";
import type { MilestoneBox } from "./connections";

/** Reuse the presentation's backend-driven current selection; never derive progress from geometry. */
export function roadmapFocusTarget(paths: JourneyPath[], module0?: Module0Summary | null, recommended?: string | null, explicit?: string | null) {
  const journey = buildJourney(paths, recommended);
  const encounters = journey.flatMap(p => p.rotations.flatMap(u => u.encounters.map(e => ({ e, id: p.id + ":" + u.id + ":" + e.session.id }))));
  const selected = encounters.find(x => x.e.session.slug === explicit);
  if (explicit) return selected ? "focus:" + selected.id : null;
  if (module0 && (!module0.completed || module0.entryBlocked)) return "focus:foundation";
  const current = encounters.find(x => x.e.current);
  if (current) return "focus:" + current.id;
  const completed = [...encounters].reverse().find(x => x.e.session.status === "completed" && !x.e.session.entryBlocked);
  if (completed) {
    const unit = journey.flatMap(p => p.rotations.map(u => ({ p, u }))).find(x => x.u.encounters.some(e => e.session === completed.e.session));
    return unit ? unit.p.id + ":" + unit.u.id + ":destination" : "focus:" + completed.id;
  }
  return module0 ? "focus:foundation" : null;
}

export function centeredRoadmapOffset(box: MilestoneBox, canvasY: number, viewport: number, content: number) {
  return Math.max(0, Math.min(Math.max(0, content - viewport), canvasY + box.y + box.height / 2 - viewport / 2));
}

/** One cancellable positioning operation per tab visit, including delayed native measurements. */
export function createRoadmapFocusController(options: {
  schedule: (fn: () => void) => void;
  scroll: (y: number) => void;
  reveal: (visible: boolean) => void;
  current: (owner: string) => boolean;
}) {
  let generation = 0, owner = "", active = false, done = false, manual = false, queued = false, ready = false;
  let target: string | null = null, viewport = 0, canvas: { y: number; height: number } | null = null;
  let boxes: Record<string, MilestoneBox> = {};
  function attempt() {
    if (!active || done || manual || queued || !ready || !options.current(owner)) return;
    if (!target) { done = true; options.reveal(true); return; }
    const box = boxes[target];
    if (!box || !canvas || viewport <= 0 || box.height <= 0 || canvas.height <= 0) return;
    const ticket = generation;
    queued = true;
    options.schedule(() => {
      if (ticket !== generation || !active || manual || done || !options.current(owner)) return;
      queued = false;
      const latest = target && boxes[target];
      if (!latest || !canvas) return;
      const y = centeredRoadmapOffset(latest, canvas.y, viewport, canvas.y + canvas.height + 40);
      done = true;
      options.scroll(y);
      options.schedule(() => { if (ticket === generation && active && options.current(owner)) options.reveal(true); });
    });
  }
  return {
    begin(nextOwner: string) { ++generation; owner = nextOwner; active = true; done = manual = queued = ready = false; boxes = {}; canvas = null; options.reveal(false); },
    end() { ++generation; active = false; },
    cancel() { if (!active) return; manual = true; options.reveal(true); },
    ready(nextOwner: string, id: string | null) { if (!active || owner !== nextOwner) return; target = id; ready = true; attempt(); },
    viewport(height: number) { viewport = height; attempt(); },
    canvas(next: { y: number; height: number }) { canvas = next; attempt(); },
    measure(id: string, box: MilestoneBox) { boxes[id] = box; attempt(); },
    explicit(id: string | null) { if (!active) return; ++generation; done = manual = queued = false; target = id; ready = true; attempt(); },
  };
}
