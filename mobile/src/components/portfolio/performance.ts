export type ScoredEncounter = {
    sessionAttemptId: string;
    sessionScore?: number | null;
    scoredAt?: string | null;
};
/** Invalid dates cannot be ordered chronologically; retain those records in history, not the trend. */
export function scoredEncounters<T extends ScoredEncounter>(patients: T[]): T[] {
    return patients.filter(p => typeof p.sessionScore === "number" && Number.isFinite(p.sessionScore) && p.sessionScore >= 0 && p.sessionScore <= 100 && !!p.scoredAt && Number.isFinite(Date.parse(p.scoredAt)))
        .map((patient, index) => ({ patient, index }))
        .sort((a, b) => Date.parse(a.patient.scoredAt!) - Date.parse(b.patient.scoredAt!) || a.index - b.index)
        .map(item => item.patient);
}
export function performanceGeometry(patients: ScoredEncounter[], viewportWidth = 292) {
    const encounters = scoredEncounters(patients);
    const width = Math.max(viewportWidth, 72 + Math.max(0, encounters.length - 1) * 44);
    const points = encounters.map((patient, index) => ({ id: patient.sessionAttemptId, score: patient.sessionScore!, x: 40 + index * (width - 72) / Math.max(1, encounters.length - 1), y: 92 - patient.sessionScore! * 0.82 }));
    return { width, points, path: points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ") };
}
