import { StyleSheet } from "react-native";
import { portfolioStyles as legacy } from "../../../assets/styles/portfolio.styles";
import { module0Fonts as f } from "../module0/tokens";
/** Scoped to Portfolio: legacy Today/shared styles are deliberately not changed. */
export const portfolioStyles = { ...legacy, ...StyleSheet.create({
        scrollContent: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34, gap: 18 },
        screenTitle: { fontFamily: f.bold, fontSize: 30, color: "#152044" },
        screenSubtitle: { fontFamily: f.regular, fontSize: 12, lineHeight: 18, color: "#727EA1" },
        screenHeaderText: { flex: 1, minWidth: 0, gap: 4 },
        dashboardHero: { backgroundColor: "#F2EEFF", borderRadius: 18, paddingHorizontal: 17, paddingVertical: 16, gap: 8 },
        identityLabel: { fontFamily: f.bold, fontSize: 10, color: "#6150ED" },
        identityTitle: { fontFamily: f.bold, fontSize: 21, color: "#152044" },
        identityDetail: { fontFamily: f.regular, fontSize: 12, lineHeight: 18, color: "#727EA1" },
        portfolioTabRow: { flexDirection: "row", backgroundColor: "#F7F6FC", padding: 5, borderRadius: 15, gap: 0 },
        portfolioTabButton: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, paddingVertical: 8 },
        portfolioTabButtonActive: { backgroundColor: "#6150ED" },
        portfolioTabText: { fontFamily: f.semibold, fontSize: 11, color: "#727EA1", textAlign: "center" },
        portfolioTabTextActive: { color: "white" },
        dashboardCard: { backgroundColor: "#F7F6FC", borderRadius: 18, paddingHorizontal: 15, paddingVertical: 16, gap: 12, borderWidth: 0 },
        dashboardCardAccent: { backgroundColor: "#F2EEFF", borderRadius: 16, padding: 16, gap: 5, borderWidth: 0 },
        sectionTitle: { fontFamily: f.bold, fontSize: 17, color: "#152044" },
        cardTitle: { fontFamily: f.semibold, fontSize: 13, lineHeight: 19, color: "#152044" },
        cardSubText: { fontFamily: f.regular, fontSize: 12, lineHeight: 18, color: "#727EA1" },
        emptyText: { fontFamily: f.regular, fontSize: 12, lineHeight: 18, color: "#727EA1" },
        smallLabel: { fontFamily: f.bold, fontSize: 11, color: "#6150ED" },
        patientCompactCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: "white" },
        patientMain: { flex: 1, minWidth: 0, gap: 4 },
        growthRow: { backgroundColor: "white", padding: 12, borderRadius: 12, flexDirection: "column", alignItems: "stretch", gap: 8 },
        growthCopy: { flex: 1, minWidth: 0 },
        progressTrack: { height: 9, borderRadius: 7, backgroundColor: "#DDD7FC", overflow: "hidden" },
        progressFill: { height: "100%", borderRadius: 7, backgroundColor: "#6150ED" },
    }) };
