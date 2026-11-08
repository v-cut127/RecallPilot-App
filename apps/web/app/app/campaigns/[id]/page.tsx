import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Mail, MessageSquare, Pause, Play, Sparkles, Users } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { formatCurrency, formatDate, formatNumber, getCampaignDetail, relativeDay, timeAgo } from "@/lib/app-data";
import { formatPercent } from "@/lib/format";
import { Avatar, Bar, Metric, MetricStrip, PageHeader, Panel, PanelHeader, RecallBadge, StatusBadge } from "@/components/app/ui";
import { toggleCampaignAction } from "@/app/app/actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireOrgContext();
  const { id } = await params;
  const campaign = await getCampaignDetail(context.organization.id, id);
  if (!campaign) notFound();

  const maxWeekly = Math.max(1, ...campaign.weekly.map((week) => week.sent));
  const maxLocation = Math.max(1, ...campaign.locations.map((location) => location.count));

  return (
    <div className="space-y-5">
      <Link href="/app/campaigns" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-ink">
        <ArrowLeft className="size-3" /> All campaigns
      </Link>

      <PageHeader
        title={campaign.name}
        description={`${campaign.treatmentLabel} recall · ${campaign.intervalMonths}-month interval · ${campaign.targetCount.toLocaleString(
          "en-US"
        )} patients in the current audience.`}
        actions={
          <>
            <StatusBadge status={campaign.status} />
            <form action={toggleCampaignAction}>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <input type="hidden" name="active" value={String(!campaign.active)} />
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.02] px-2.5 text-[12px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                {campaign.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {campaign.active ? "Pause campaign" : "Activate campaign"}
              </button>
            </form>
          </>
        }
      />

      <MetricStrip>
        <Metric label="Audience" value={formatNumber(campaign.targetCount)} changeLabel="due in current window" icon={<Users />} />
        <Metric label="Contacted" value={formatNumber(campaign.contacted)} changeLabel={`${formatPercent(campaign.responseRate)} response rate`} icon={<MessageSquare />} />
        <Metric label="Booked" value={formatNumber(campaign.bookings)} changeLabel={`${formatPercent(campaign.bookingRate)} of replies`} icon={<CalendarClock />} />
        <Metric label="Revenue recovered" value={formatCurrency(campaign.recovered)} changeLabel="attributed to this campaign" icon={<Sparkles />} />
      </MetricStrip>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Communication sequence" description="A three-touch sequence, paused automatically after a reply." />
            <div className="divide-y divide-line/70">
              {[
                {
                  day: "Day 0",
                  channel: "SMS",
                  title: "First touch",
                  body: `Hi {{first_name}}, this is {{practice}}. Your ${campaign.treatmentLabel.toLowerCase()} recall is due. Would you like us to find a time?`,
                },
                {
                  day: "Day 7",
                  channel: "SMS",
                  title: "Friendly reminder",
                  body: `Just following up — we still have openings for your ${campaign.treatmentLabel.toLowerCase()} visit. Reply with a day that works.`,
                },
                {
                  day: "Day 21",
                  channel: "Email",
                  title: "Final follow-up",
                  body: `It's not too late to book your recall. Reply to this email and we'll take care of the rest.`,
                },
              ].map((step, index) => (
                <div key={step.day} className="flex gap-3 px-4 py-3">
                  <div className="flex flex-col items-center">
                    <span className="flex size-6 items-center justify-center rounded-[5px] border border-line bg-surface-2 text-[9px] font-semibold text-[#8ed8ff]">
                      {index + 1}
                    </span>
                    {index < 2 ? <span className="mt-1 h-full w-px bg-line" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-medium text-[#dbe4f3]">{step.title}</span>
                      <span className="text-[10px] text-muted-foreground">{step.day}</span>
                      <span className="inline-flex items-center gap-1 rounded-[4px] border border-line px-1 py-0.5 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
                        {step.channel === "SMS" ? <MessageSquare className="size-2.5" /> : <Mail className="size-2.5" />}
                        {step.channel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Sequenced volume"
              description="Outbound messages and responses over the last eight weeks."
              actions={
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#2f8fe0]" /> Sent</span>
                  <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#53d2e5]" /> Responses</span>
                </div>
              }
            />
            <div className="px-4 py-4">
              <div className="flex h-[150px] items-end gap-2">
                {campaign.weekly.map((week) => (
                  <div key={week.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${week.sent} sent · ${week.responses} responses`}>
                    <div className="flex w-full items-end justify-center gap-0.5">
                      <div className="w-[38%] rounded-t-[2px] bg-[#2f8fe0]/70 transition-colors group-hover:bg-[#2f8fe0]" style={{ height: `${Math.max(4, (week.sent / maxWeekly) * 118)}px` }} />
                      <div className="w-[26%] rounded-t-[2px] bg-[#53d2e5]/70 transition-colors group-hover:bg-[#53d2e5]" style={{ height: `${Math.max(2, (week.responses / maxWeekly) * 118)}px` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground/60">{week.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Patient activity"
              description="The audience currently inside this recall window."
              actions={<Link href="/app/patients?status=needs_recall" className="text-[11px] text-muted-foreground hover:text-ink">View all</Link>}
            />
            <div className="overflow-x-auto app-scroll">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                    <th className="py-2 pl-4 pr-2 font-medium">Patient</th>
                    <th className="px-2 py-2 font-medium">Recall due</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Est. value</th>
                    <th className="py-2 pl-2 pr-4 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.audience.map((patient) => (
                    <tr key={patient.id} className="border-b border-line/60 last:border-0 hover:bg-white/[0.018]">
                      <td className="py-2.5 pl-4 pr-2">
                        <Link href={`/app/patients/${patient.id}`} className="flex items-center gap-2">
                          <Avatar name={patient.name} size="sm" />
                          <span className="truncate text-[12px] font-medium text-[#dbe4f3]">{patient.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-muted-foreground">{relativeDay(patient.recallDue)}</td>
                      <td className="px-2 py-2.5"><RecallBadge status={patient.recallStatus} /></td>
                      <td className="tabular px-2 py-2.5 text-[12px] text-[#c5d2e8]">{formatCurrency(patient.estimatedValue)}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right">
                        <Link href={`/app/patients/${patient.id}`} className="inline-flex size-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink">
                          <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Audience mix" description="Where the current audience sits." />
            <div className="space-y-3 px-4 py-3">
              {campaign.locations.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No location data for this audience.</p>
              ) : (
                campaign.locations.map((location) => (
                  <div key={location.name}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="truncate text-muted-foreground">{location.name}</span>
                      <span className="tabular text-[#c5d2e8]">{location.count}</span>
                    </div>
                    <Bar value={location.count} max={maxLocation} tone="blue" />
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Scheduled messages" description="Next sends in the sequence." />
            <div className="divide-y divide-line/70">
              {campaign.scheduled.map((message) => (
                <div key={message.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-[#53d2e5]/10 text-[#53d2e5]">
                    {message.channel === "SMS" ? <MessageSquare className="size-3.5" /> : <Mail className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#dbe4f3]">{message.patientName}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{message.template} · {message.channel}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(message.sendAt, "d MMM")}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Campaign details" />
            <div className="space-y-2.5 px-4 py-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Audience rule</span>
                <span className="text-right text-[#c5d2e8]">{campaign.treatmentLabel} · {campaign.intervalMonths} mo</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Created</span>
                <span className="text-[#c5d2e8]">{formatDate(campaign.createdAt, "d MMM yyyy")}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Next send</span>
                <span className="text-[#c5d2e8]">{campaign.scheduled[0] ? formatDate(campaign.scheduled[0].sendAt, "d MMM") : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Sequence</span>
                <span className="text-[#c5d2e8]">3 touches</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Recent activity" />
            <div className="divide-y divide-line/70">
              {campaign.activity.map((item) => (
                <div key={item.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium text-[#dbe4f3]">{item.title}</p>
                    <span className="shrink-0 text-[9px] text-muted-foreground/70">{timeAgo(item.occurredAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.subject} · {item.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
