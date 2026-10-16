import { useRef, useState } from "react";
import { ScrollView } from "react-native";
import { createRoadmapFocusController } from "./focus";

export function useRoadmapFocus(owner: string, active: boolean) {
  const scroll = useRef<ScrollView>(null);
  const [visible, setVisible] = useState(false);
  const latest = useRef({ owner, active });
  latest.current = { owner, active };
  const controller = useRef<ReturnType<typeof createRoadmapFocusController> | null>(null);
  if (!controller.current) controller.current = createRoadmapFocusController({
    schedule: fn => requestAnimationFrame(fn),
    scroll: y => scroll.current?.scrollTo({ y, animated: false }),
    reveal: setVisible,
    current: candidate => latest.current.active && latest.current.owner === candidate,
  });
  return { scroll, visible, controller: controller.current };
}
