/** Presentation-only geometry; independent learning paths never share a curve. */
export type MilestoneBox = { x: number; y: number; width: number; height: number };
export function connectMilestones(groups: string[][], boxes: Record<string, MilestoneBox>, width: number) {
  return groups.flatMap(group => group.slice(1).flatMap((to, index) => {
    const from = group[index], a = boxes[from], b = boxes[to];
    if (!a || !b || width <= 0) return [];
    const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    if (end.y <= start.y) return [];
    const top = start.y, height = end.y - start.y;
    const amplitude = Math.min(72, width * .19);
    const middle = {
      x: Math.max(12, Math.min(width - 12, (start.x + end.x) / 2 + (index % 2 ? -1 : 1) * amplitude)),
      y: top + height / 2,
    };
    // Two large flowing cubic arcs; vertical tangents match at the hub and every stage.
    const handle = height / 4;
    const d = `M ${start.x} ${start.y} C ${start.x} ${top + handle} ${middle.x} ${middle.y - handle} ${middle.x} ${middle.y} C ${middle.x} ${middle.y + handle} ${end.x} ${end.y - handle} ${end.x} ${end.y}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 ${top} ${width} ${height}"><path d="${d}" fill="none" stroke="#C9C3F0" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="9 11"/></svg>`;
    return [{ from, to, start, end, middle, top, height, d, uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }];
  }));
}
