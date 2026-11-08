import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "./report-format";
const colors = {
    ink: "#00061C",
    muted: "#526078",
    border: "#DCE5EF",
    card: "#F5F8FC",
    accent: "#006EC3",
    warning: "#9A6700",
    warningSoft: "#FFF8E6",
    white: "#FFFFFF",
};
const styles = StyleSheet.create({
    page: {
        paddingTop: 42,
        paddingBottom: 46,
        paddingHorizontal: 38,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: colors.ink,
        lineHeight: 1.4,
    },
    header: {
        position: "absolute",
        top: 18,
        left: 38,
        right: 38,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 6,
    },
    brand: { fontFamily: "Helvetica-Bold", fontSize: 12, letterSpacing: 0.3 },
    headerMeta: { fontSize: 8, color: colors.muted },
    footer: {
        position: "absolute",
        bottom: 18,
        left: 38,
        right: 38,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 6,
        fontSize: 7,
        color: colors.muted,
    },
    title: { fontFamily: "Helvetica-Bold", fontSize: 26, marginTop: 12, marginBottom: 4 },
    subtitle: { fontSize: 10, color: colors.muted, marginBottom: 14 },
    estimateBanner: {
        backgroundColor: colors.warningSoft,
        borderWidth: 1,
        borderColor: "#E5D49A",
        borderRadius: 6,
        padding: 10,
        marginBottom: 14,
    },
    estimateTitle: { fontFamily: "Helvetica-Bold", color: colors.warning, fontSize: 9, marginBottom: 3 },
    estimateText: { fontSize: 8.5, color: colors.ink },
    hero: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 16,
        marginBottom: 14,
    },
    heroLabel: { fontSize: 8, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
    heroValue: { fontFamily: "Helvetica-Bold", fontSize: 34, marginTop: 4, marginBottom: 2 },
    heroNote: { fontSize: 8, color: colors.muted },
    metricRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    metric: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 10,
    },
    metricLabel: { fontSize: 7.5, color: colors.muted, marginBottom: 2 },
    metricValue: { fontFamily: "Helvetica-Bold", fontSize: 16 },
    metricNote: { fontSize: 7, color: colors.muted, marginTop: 2 },
    sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 10, marginBottom: 6 },
    sectionNote: { fontSize: 8, color: colors.muted, marginBottom: 8 },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 5, overflow: "hidden" },
    tableHeader: { flexDirection: "row", backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
    tableRowLast: { flexDirection: "row" },
    th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: colors.muted, padding: 5 },
    td: { fontSize: 8, padding: 5 },
    right: { textAlign: "right" },
    assumption: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 5,
        padding: 8,
        marginBottom: 6,
    },
    assumptionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    assumptionBadge: {
        backgroundColor: colors.warningSoft,
        color: colors.warning,
        fontFamily: "Helvetica-Bold",
        fontSize: 6.5,
        borderRadius: 3,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    assumptionLabel: { fontFamily: "Helvetica-Bold", fontSize: 8 },
    assumptionValue: { fontSize: 7.5, color: colors.muted },
    assumptionText: { fontSize: 7.5, color: colors.muted },
    message: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 5,
        padding: 9,
        marginBottom: 6,
        backgroundColor: colors.card,
    },
    messageLabel: { fontSize: 6.5, color: colors.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
    messageSubject: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 3 },
    messageBody: { fontSize: 7.5, color: colors.muted },
    disclaimer: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        fontSize: 7,
        color: colors.muted,
    },
});
function treatmentRows(summary) {
    return summary.byTreatment.map((row) => (_jsxs(View, { style: styles.tableRow, wrap: false, children: [_jsx(Text, { style: [styles.td, { width: "19%" }], children: row.label }), _jsx(Text, { style: [styles.td, { width: "13%" }], children: formatNumber(row.overduePatients) }), _jsx(Text, { style: [styles.td, { width: "15%" }], children: formatNumber(row.lapsedPatients) }), _jsx(Text, { style: [styles.td, { width: "13%" }], children: formatNumber(row.dueNext30) }), _jsx(Text, { style: [styles.td, { width: "18%" }], children: formatCurrency(row.averageProductionAssumption) }), _jsx(Text, { style: [styles.td, styles.right, { width: "22%" }], children: formatCurrency(row.estimatedProductionAtRisk) })] }, row.treatmentType)));
}
function AuditPdfDocument({ summary, reportUrl, expiresAt, }) {
    const practiceName = summary.practiceName ?? "Your practice";
    return (_jsxs(Document, { title: `RecallPilot audit — ${practiceName}`, author: "RecallPilot", subject: "Recall revenue audit", children: [_jsxs(Page, { size: "A4", style: styles.page, children: [_jsxs(View, { style: styles.header, fixed: true, children: [_jsx(Text, { style: styles.brand, children: "RecallPilot" }), _jsx(Text, { style: styles.headerMeta, children: "Recall revenue audit \u00B7 Estimate" })] }), _jsxs(View, { style: styles.footer, fixed: true, children: [_jsxs(Text, { children: ["Report: ", reportUrl] }), _jsx(Text, { render: ({ pageNumber, totalPages }) => `Expires ${formatDateTime(expiresAt)} · Page ${pageNumber} of ${totalPages}` })] }), _jsx(Text, { style: styles.title, children: "Recall revenue audit" }), _jsxs(Text, { style: styles.subtitle, children: [practiceName, " \u00B7 Audit date ", formatDate(summary.asOfDate), " \u00B7 Generated ", formatDateTime(summary.generatedAt)] }), _jsxs(View, { style: styles.estimateBanner, children: [_jsx(Text, { style: styles.estimateTitle, children: "ESTIMATE \u2014 NOT GUARANTEED REVENUE" }), _jsx(Text, { style: styles.estimateText, children: summary.disclaimer })] }), _jsxs(View, { style: styles.hero, children: [_jsx(Text, { style: styles.heroLabel, children: "Estimated production at risk" }), _jsx(Text, { style: styles.heroValue, children: formatCurrency(summary.production.total) }), _jsxs(Text, { style: styles.heroNote, children: [formatNumber(summary.counts.overduePatients), " overdue + ", formatNumber(summary.counts.dueNext30), " due in the next 30 days. Lapsed 12\u201324 months is included in overdue, not added again."] })] }), _jsxs(View, { style: styles.metricRow, children: [_jsxs(View, { style: styles.metric, children: [_jsx(Text, { style: styles.metricLabel, children: "Overdue patients" }), _jsx(Text, { style: styles.metricValue, children: formatNumber(summary.counts.overduePatients) }), _jsxs(Text, { style: styles.metricNote, children: [formatCurrency(summary.production.overdue), " estimated"] })] }), _jsxs(View, { style: styles.metric, children: [_jsx(Text, { style: styles.metricLabel, children: "Lapsed 12\u201324 months" }), _jsx(Text, { style: styles.metricValue, children: formatNumber(summary.counts.lapsedPatients) }), _jsxs(Text, { style: styles.metricNote, children: [formatCurrency(summary.production.lapsedIncluded), " included in overdue"] })] }), _jsxs(View, { style: styles.metric, children: [_jsx(Text, { style: styles.metricLabel, children: "Due next 30 days" }), _jsx(Text, { style: styles.metricValue, children: formatNumber(summary.counts.dueNext30) }), _jsxs(Text, { style: styles.metricNote, children: [formatCurrency(summary.production.dueNext30), " estimated"] })] })] }), _jsx(Text, { style: styles.sectionTitle, children: "Overdue by treatment type" }), _jsx(Text, { style: styles.sectionNote, children: "Lapsed patients are a subset of overdue. Production is an estimate using the average values below." }), _jsxs(View, { style: styles.table, children: [_jsxs(View, { style: styles.tableHeader, children: [_jsx(Text, { style: [styles.th, { width: "19%" }], children: "Treatment" }), _jsx(Text, { style: [styles.th, { width: "13%" }], children: "Overdue" }), _jsx(Text, { style: [styles.th, { width: "15%" }], children: "Lapsed 12\u201324m" }), _jsx(Text, { style: [styles.th, { width: "13%" }], children: "Due 30d" }), _jsx(Text, { style: [styles.th, { width: "18%" }], children: "Avg. value" }), _jsx(Text, { style: [styles.th, styles.right, { width: "22%" }], children: "Est. production" })] }), treatmentRows(summary)] }), summary.byLocation.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.sectionTitle, children: "By location" }), _jsxs(View, { style: styles.table, children: [_jsxs(View, { style: styles.tableHeader, children: [_jsx(Text, { style: [styles.th, { width: "40%" }], children: "Location" }), _jsx(Text, { style: [styles.th, { width: "15%" }], children: "Patients" }), _jsx(Text, { style: [styles.th, { width: "15%" }], children: "Overdue" }), _jsx(Text, { style: [styles.th, { width: "30%", textAlign: "right" }], children: "Est. production" })] }), summary.byLocation.slice(0, 12).map((location) => (_jsxs(View, { style: styles.tableRow, children: [_jsx(Text, { style: [styles.td, { width: "40%" }], children: location.locationName }), _jsx(Text, { style: [styles.td, { width: "15%" }], children: formatNumber(location.totalPatients) }), _jsx(Text, { style: [styles.td, { width: "15%" }], children: formatNumber(location.overduePatients) }), _jsx(Text, { style: [styles.td, styles.right, { width: "30%" }], children: formatCurrency(location.estimatedProductionAtRisk) })] }, location.locationName)))] })] })) : null, _jsx(Text, { style: styles.sectionTitle, children: "Data quality" }), _jsxs(Text, { style: styles.sectionNote, children: [formatNumber(summary.dataQuality.rowsImported), " rows imported \u00B7", " ", formatNumber(summary.dataQuality.rowsValid), " valid \u00B7", " ", formatNumber(summary.dataQuality.rowsWithErrors), " excluded \u00B7", " ", formatNumber(summary.dataQuality.rowsWithWarnings), " warnings \u00B7", " ", summary.dataQuality.confidence === "directional" ? "directional sample" : "standard sample"] })] }), _jsxs(Page, { size: "A4", style: styles.page, children: [_jsxs(View, { style: styles.header, fixed: true, children: [_jsx(Text, { style: styles.brand, children: "RecallPilot" }), _jsx(Text, { style: styles.headerMeta, children: "Assumptions and sample messages" })] }), _jsxs(View, { style: styles.footer, fixed: true, children: [_jsxs(Text, { children: ["Report: ", reportUrl] }), _jsx(Text, { render: ({ pageNumber, totalPages }) => `Expires ${formatDateTime(expiresAt)} · Page ${pageNumber} of ${totalPages}` })] }), _jsx(Text, { style: styles.title, children: "Assumptions" }), _jsx(Text, { style: styles.subtitle, children: "Every production figure in this report is an estimate. These are the inputs." }), summary.assumptions.map((assumption) => (_jsxs(View, { style: styles.assumption, wrap: false, children: [_jsxs(View, { style: styles.assumptionHead, children: [_jsx(Text, { style: styles.assumptionBadge, children: "ASSUMPTION" }), _jsx(Text, { style: styles.assumptionLabel, children: assumption.label }), _jsx(Text, { style: styles.assumptionValue, children: assumption.value })] }), _jsx(Text, { style: styles.assumptionText, children: assumption.description })] }, assumption.key))), _jsx(Text, { style: styles.sectionTitle, children: "Sample recall messages" }), _jsx(Text, { style: styles.sectionNote, children: "English templates only. No message was sent in R1. Clinical questions always go to the practice team." }), summary.sampleMessages.map((message) => (_jsxs(View, { style: styles.message, wrap: false, children: [_jsx(Text, { style: styles.messageLabel, children: message.label }), _jsx(Text, { style: styles.messageSubject, children: message.subject }), _jsx(Text, { style: styles.messageBody, children: message.body })] }, message.treatmentType))), _jsxs(View, { style: styles.disclaimer, children: [_jsx(Text, { children: summary.disclaimer }), _jsxs(Text, { style: { marginTop: 4 }, children: ["Report link: ", reportUrl, " \u00B7 Expires ", formatDateTime(expiresAt), " \u00B7 Tokenized, revocable."] })] })] })] }));
}
export async function renderAuditPdf(input) {
    const buffer = await renderToBuffer(_jsx(AuditPdfDocument, { summary: input.summary, reportUrl: input.reportUrl, expiresAt: input.expiresAt }));
    return Buffer.from(buffer);
}
//# sourceMappingURL=pdf.js.map