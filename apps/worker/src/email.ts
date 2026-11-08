import { formatCurrency, formatDateTime, formatNumber, type AuditSummary } from "@recallpilot/core";

export function reportEmail(input: {
  practiceName: string;
  summary: AuditSummary;
  reportUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const { summary, reportUrl, expiresAt } = input;
  const practiceName = input.practiceName || summary.practiceName || "your practice";
  const subject = `Your RecallPilot audit: ${formatCurrency(summary.production.total)} estimated production at risk`;
  const text = [
    `RecallPilot recall audit for ${practiceName}`,
    "",
    `Estimated production at risk: ${formatCurrency(summary.production.total)} (estimate, assumptions apply)`,
    `Overdue patients: ${formatNumber(summary.counts.overduePatients)}`,
    `Lapsed 12–24 months: ${formatNumber(summary.counts.lapsedPatients)} (included in overdue)`,
    `Due next 30 days: ${formatNumber(summary.counts.dueNext30)}`,
    "",
    `Open the report: ${reportUrl}`,
    `This link expires ${formatDateTime(expiresAt)} and can be revoked by the practice.`,
    "",
    summary.disclaimer,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;color:#00061c;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #dce5ef;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:24px;border-bottom:1px solid #dce5ef;">
                <strong style="font-size:18px;color:#00061c;">RecallPilot</strong>
                <span style="float:right;font-size:11px;color:#526078;text-transform:uppercase;letter-spacing:1px;">Estimate</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 6px;font-size:12px;color:#526078;">Recall revenue audit for ${escapeHtml(practiceName)}</p>
                <p style="margin:0 0 4px;font-size:13px;color:#526078;">Estimated production at risk</p>
                <p style="margin:0 0 8px;font-size:40px;line-height:1.1;color:#00061c;font-weight:600;">${formatCurrency(summary.production.total)}</p>
                <p style="margin:0 0 18px;font-size:12px;color:#526078;">This is an estimate based on the assumptions in the report, not guaranteed revenue.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="padding:12px;background:#f5f8fc;border:1px solid #dce5ef;border-radius:8px;">
                      <p style="margin:0;font-size:11px;color:#526078;">Overdue</p>
                      <p style="margin:2px 0 0;font-size:20px;color:#00061c;"><strong>${formatNumber(summary.counts.overduePatients)}</strong></p>
                    </td>
                    <td style="width:8px;"></td>
                    <td style="padding:12px;background:#f5f8fc;border:1px solid #dce5ef;border-radius:8px;">
                      <p style="margin:0;font-size:11px;color:#526078;">Lapsed 12–24m</p>
                      <p style="margin:2px 0 0;font-size:20px;color:#00061c;"><strong>${formatNumber(summary.counts.lapsedPatients)}</strong></p>
                    </td>
                    <td style="width:8px;"></td>
                    <td style="padding:12px;background:#f5f8fc;border:1px solid #dce5ef;border-radius:8px;">
                      <p style="margin:0;font-size:11px;color:#526078;">Due in 30d</p>
                      <p style="margin:2px 0 0;font-size:20px;color:#00061c;"><strong>${formatNumber(summary.counts.dueNext30)}</strong></p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px;">
                  <a href="${reportUrl}" style="display:inline-block;background:#006ec3;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:7px;font-size:14px;">Open the audit report</a>
                </p>
                <p style="margin:0;font-size:12px;color:#526078;">The PDF is attached. The link expires ${formatDateTime(expiresAt)} and the practice can revoke it at any time.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#f5f8fc;border-top:1px solid #dce5ef;font-size:11px;color:#526078;">
                ${escapeHtml(summary.disclaimer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
