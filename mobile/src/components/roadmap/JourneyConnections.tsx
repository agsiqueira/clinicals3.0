import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { connectMilestones, type MilestoneBox } from "./connections";

type Registry = {
  register: (id: string, ref: any, region: boolean, focusOnly?: boolean) => () => void;
  refresh: () => void;
  setGroup: (id: string, stages: string[]) => () => void;
  foundation: boolean;
};
const Context = createContext<Registry | null>(null);

/** Background path, then scenery and all foreground content. No obstacle-driven rerouting. */
export function JourneyCanvas({ children, scenery: Scenery, foundation, onFocusMeasure, onCanvasLayout }: { children: ReactNode; scenery: ComponentType; foundation: boolean; onFocusMeasure?: (id: string, box: MilestoneBox) => void; onCanvasLayout?: (box: { y: number; height: number }) => void }) {
  const canvas = useRef<View>(null);
  const focusCallback = useRef(onFocusMeasure); focusCallback.current = onFocusMeasure;
  const refs = useRef(new Map<string, { ref: any; region: boolean; focusOnly?: boolean }>());
  const [width, setWidth] = useState(0);
  const [boxes, setBoxes] = useState<Record<string, MilestoneBox>>({});
  const [regions, setRegions] = useState<Record<string, MilestoneBox>>({});
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const refresh = useCallback(() => {
    refs.current.forEach((entry, id) => entry.ref.current?.measureLayout(canvas.current, (x: number, y: number, w: number, h: number) => {
      if (refs.current.get(id) !== entry) return;
      focusCallback.current?.(id, { x, y, width: w, height: h });
      if (entry.focusOnly) return;
      const update = entry.region ? setRegions : setBoxes;
      update(current => {
        const old = current[id];
        if (old && old.x === x && old.y === y && old.width === w && old.height === h) return current;
        return { ...current, [id]: { x, y, width: w, height: h } };
      });
    }, () => {}));
  }, []);
  const register = useCallback((id: string, ref: any, region: boolean, focusOnly = false) => {
    refs.current.set(id, { ref, region, focusOnly });
    refresh();
    return () => { refs.current.delete(id); (region ? setRegions : setBoxes)(current => { const next = { ...current }; delete next[id]; return next; }); };
  }, [refresh]);
  const setGroup = useCallback((id: string, stages: string[]) => {
    setGroups(current => ({ ...current, [id]: stages }));
    return () => setGroups(current => { const next = { ...current }; delete next[id]; return next; });
  }, []);
  const context = useMemo(() => ({ register, refresh, setGroup, foundation }), [register, refresh, setGroup, foundation]);
  return <Context.Provider value={context}>
    <View ref={canvas} testID="journey-canvas" collapsable={false} onLayout={event => { setWidth(event.nativeEvent.layout.width); onCanvasLayout?.(event.nativeEvent.layout); refresh(); }}>
      {connectMilestones(Object.values(groups), boxes, width).map(edge => <Image key={`${edge.from}:${edge.to}`} testID={`connection-${edge.from}-${edge.to}`} pointerEvents="none" accessible={false} source={{ uri: edge.uri }} contentFit="fill" transition={0} style={{ position: "absolute", left: 0, top: edge.top, width, height: edge.height }} />)}
      {Object.entries(regions).map(([id, box]) => <View key={id} pointerEvents="none" style={{ position: "absolute", left: box.x, top: box.y, width: box.width, height: box.height }}><Scenery /></View>)}
      {children}
    </View>
  </Context.Provider>;
}

export function JourneyStage({ id, children, style, region = false, testID }: { id: string; children: ReactNode; style?: any; region?: boolean; testID?: string }) {
  const context = useContext(Context), ref = useRef<View>(null);
  useEffect(() => context?.register(id, ref, region), [context, id, region]);
  return <View ref={ref} testID={testID ?? `${region ? "scenic-region" : "milestone"}-${id}`} collapsable={false} onLayout={context?.refresh} style={style}>{children}</View>;
}

export function useJourneyChain(id: string, stages: string[], includeFoundation: boolean) {
  const context = useContext(Context);
  const key = JSON.stringify(stages);
  useEffect(() => context?.setGroup(id, includeFoundation && context.foundation ? ["foundation", ...stages] : stages), [context, id, key, includeFoundation]);
}

export function JourneyChain({ id, stages, includeFoundation, children }: { id: string; stages: string[]; includeFoundation: boolean; children: ReactNode }) {
  useJourneyChain(id, stages, includeFoundation);
  return <View>{children}</View>;
}

/** Observe the complete lesson without adding a wrapper or changing connector anchors. */
export function useJourneyFocusAnchor(id: string) {
  const context = useContext(Context), ref = useRef<View>(null);
  useEffect(() => context?.register("focus:" + id, ref, false, true), [context, id]);
  return { ref, onLayout: context?.refresh, collapsable: false as const };
}
