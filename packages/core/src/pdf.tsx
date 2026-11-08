import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { AuditSummary } from "./types";
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

function treatmentRows(summary: AuditSummary) {
  return summary.byTreatment.map((row) => (
    <View key={row.treatmentType} style={styles.tableRow} wrap={false}>
      <Text style={[styles.td, { width: "19%" }]}>{row.label}</Text>
      <Text style={[styles.td, { width: "13%" }]}>{formatNumber(row.overduePatients)}</Text>
      <Text style={[styles.td, { width: "15%" }]}>{formatNumber(row.lapsedPatients)}</Text>
      <Text style={[styles.td, { width: "13%" }]}>{formatNumber(row.dueNext30)}</Text>
      <Text style={[styles.td, { width: "18%" }]}>{formatCurrency(row.averageProductionAssumption)}</Text>
      <Text style={[styles.td, styles.right, { width: "22%" }]}>{formatCurrency(row.estimatedProductionAtRisk)}</Text>
    </View>
  ));
}

function AuditPdfDocument({
  summary,
  reportUrl,
  expiresAt,
}: {
  summary: AuditSummary;
  reportUrl: string;
  expiresAt: Date;
}) {
  const practiceName = summary.practiceName ?? "Your practice";
  return (
    <Document title={`RecallPilot audit — ${practiceName}`} author="RecallPilot" subject="Recall revenue audit">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>RecallPilot</Text>
          <Text style={styles.headerMeta}>Recall revenue audit · Estimate</Text>
        </View>
        <View style={styles.footer} fixed>
          <Text>Report: {reportUrl}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Expires ${formatDateTime(expiresAt)} · Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        <Text style={styles.title}>Recall revenue audit</Text>
        <Text style={styles.subtitle}>
          {practiceName} · Audit date {formatDate(summary.asOfDate)} · Generated {formatDateTime(summary.generatedAt)}
        </Text>

        <View style={styles.estimateBanner}>
          <Text style={styles.estimateTitle}>ESTIMATE — NOT GUARANTEED REVENUE</Text>
          <Text style={styles.estimateText}>{summary.disclaimer}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Estimated production at risk</Text>
          <Text style={styles.heroValue}>{formatCurrency(summary.production.total)}</Text>
          <Text style={styles.heroNote}>
            {formatNumber(summary.counts.overduePatients)} overdue + {formatNumber(summary.counts.dueNext30)} due in the
            next 30 days. Lapsed 12–24 months is included in overdue, not added again.
          </Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Overdue patients</Text>
            <Text style={styles.metricValue}>{formatNumber(summary.counts.overduePatients)}</Text>
            <Text style={styles.metricNote}>{formatCurrency(summary.production.overdue)} estimated</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Lapsed 12–24 months</Text>
            <Text style={styles.metricValue}>{formatNumber(summary.counts.lapsedPatients)}</Text>
            <Text style={styles.metricNote}>{formatCurrency(summary.production.lapsedIncluded)} included in overdue</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Due next 30 days</Text>
            <Text style={styles.metricValue}>{formatNumber(summary.counts.dueNext30)}</Text>
            <Text style={styles.metricNote}>{formatCurrency(summary.production.dueNext30)} estimated</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Overdue by treatment type</Text>
        <Text style={styles.sectionNote}>
          Lapsed patients are a subset of overdue. Production is an estimate using the average values below.
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: "19%" }]}>Treatment</Text>
            <Text style={[styles.th, { width: "13%" }]}>Overdue</Text>
            <Text style={[styles.th, { width: "15%" }]}>Lapsed 12–24m</Text>
            <Text style={[styles.th, { width: "13%" }]}>Due 30d</Text>
            <Text style={[styles.th, { width: "18%" }]}>Avg. value</Text>
            <Text style={[styles.th, styles.right, { width: "22%" }]}>Est. production</Text>
          </View>
          {treatmentRows(summary)}
        </View>

        {summary.byLocation.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>By location</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: "40%" }]}>Location</Text>
                <Text style={[styles.th, { width: "15%" }]}>Patients</Text>
                <Text style={[styles.th, { width: "15%" }]}>Overdue</Text>
                <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>Est. production</Text>
              </View>
              {summary.byLocation.slice(0, 12).map((location) => (
                <View key={location.locationName} style={styles.tableRow}>
                  <Text style={[styles.td, { width: "40%" }]}>{location.locationName}</Text>
                  <Text style={[styles.td, { width: "15%" }]}>{formatNumber(location.totalPatients)}</Text>
                  <Text style={[styles.td, { width: "15%" }]}>{formatNumber(location.overduePatients)}</Text>
                  <Text style={[styles.td, styles.right, { width: "30%" }]}>
                    {formatCurrency(location.estimatedProductionAtRisk)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Data quality</Text>
        <Text style={styles.sectionNote}>
          {formatNumber(summary.dataQuality.rowsImported)} rows imported ·{" "}
          {formatNumber(summary.dataQuality.rowsValid)} valid ·{" "}
          {formatNumber(summary.dataQuality.rowsWithErrors)} excluded ·{" "}
          {formatNumber(summary.dataQuality.rowsWithWarnings)} warnings ·{" "}
          {summary.dataQuality.confidence === "directional" ? "directional sample" : "standard sample"}
        </Text>

      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>RecallPilot</Text>
          <Text style={styles.headerMeta}>Assumptions and sample messages</Text>
        </View>
        <View style={styles.footer} fixed>
          <Text>Report: {reportUrl}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Expires ${formatDateTime(expiresAt)} · Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        <Text style={styles.title}>Assumptions</Text>
        <Text style={styles.subtitle}>
          Every production figure in this report is an estimate. These are the inputs.
        </Text>

        {summary.assumptions.map((assumption) => (
          <View key={assumption.key} style={styles.assumption} wrap={false}>
            <View style={styles.assumptionHead}>
              <Text style={styles.assumptionBadge}>ASSUMPTION</Text>
              <Text style={styles.assumptionLabel}>{assumption.label}</Text>
              <Text style={styles.assumptionValue}>{assumption.value}</Text>
            </View>
            <Text style={styles.assumptionText}>{assumption.description}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Sample recall messages</Text>
        <Text style={styles.sectionNote}>
          English templates only. No message was sent in R1. Clinical questions always go to the practice team.
        </Text>
        {summary.sampleMessages.map((message) => (
          <View key={message.treatmentType} style={styles.message} wrap={false}>
            <Text style={styles.messageLabel}>{message.label}</Text>
            <Text style={styles.messageSubject}>{message.subject}</Text>
            <Text style={styles.messageBody}>{message.body}</Text>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text>{summary.disclaimer}</Text>
          <Text style={{ marginTop: 4 }}>
            Report link: {reportUrl} · Expires {formatDateTime(expiresAt)} · Tokenized, revocable.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderAuditPdf(input: {
  summary: AuditSummary;
  reportUrl: string;
  expiresAt: Date;
}): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <AuditPdfDocument summary={input.summary} reportUrl={input.reportUrl} expiresAt={input.expiresAt} />
  );
  return Buffer.from(buffer);
}
