"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus, Search, ShieldCheck } from "lucide-react";
import { Panel, PageHeader, StatusBadge } from "./ui";
import { Modal } from "./client-ui";

interface Integration {
  id: string;
  name: string;
  category: "Practice management" | "Messaging" | "Scheduling";
  description: string;
  connected: boolean;
  managed?: boolean;
  logo: string;
}

export function IntegrationsView({ config }: { config: { email: string; storage: string; supabase: boolean } }) {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "dentally",
      name: "Dentally",
      category: "Practice management",
      description: "Sync patients, appointments and recall dates from your practice system.",
      connected: false,
      logo: "/integrations/dentally.svg",
    },
    {
      id: "cliniko",
      name: "Cliniko",
      category: "Practice management",
      description: "Two-way patient and appointment sync with Cliniko.",
      connected: false,
      logo: "/integrations/cliniko.png",
    },
    {
      id: "open-dental",
      name: "Open Dental",
      category: "Practice management",
      description: "Import recall lists and write appointment confirmations back.",
      connected: false,
      logo: "/integrations/open-dental.png",
    },
    {
      id: "resend",
      name: "Resend",
      category: "Messaging",
      description: "Transactional email delivery for recall sequences and audit reports.",
      connected: config.email === "resend",
      managed: config.email === "resend",
      logo: "/integrations/resend.png",
    },
    {
      id: "twilio",
      name: "Twilio",
      category: "Messaging",
      description: "SMS delivery with consent-aware opt-out handling.",
      connected: false,
      logo: "/integrations/twilio.png",
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      category: "Scheduling",
      description: "Offer live appointment availability from the practice calendar.",
      connected: false,
      logo: "/integrations/google-calendar.svg",
    },
  ]);
  const [filter, setFilter] = useState<"all" | "connected" | "available">("all");
  const [query, setQuery] = useState("");
  const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return integrations.filter((integration) => {
      if (filter === "connected" && !integration.connected) return false;
      if (filter === "available" && integration.connected) return false;
      if (needle && !integration.name.toLowerCase().includes(needle) && !integration.description.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [integrations, filter, query]);

  const connectedCount = integrations.filter((integration) => integration.connected).length;

  const connect = () => {
    if (!connectTarget) return;
    setIntegrations((current) =>
      current.map((integration) => (integration.id === connectTarget.id ? { ...integration, connected: true } : integration))
    );
    setConnectTarget(null);
    setApiKey("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        description="Connect the practice stack so recall data and outreach stay in sync."
        actions={
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.02] px-2.5 text-[12px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <Plus className="size-3.5" /> Request an integration
          </button>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <div className="flex items-center gap-1">
            {[
              { value: "all" as const, label: "All", count: integrations.length },
              { value: "connected" as const, label: "Connected", count: connectedCount },
              { value: "available" as const, label: "Available", count: integrations.length - connectedCount },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[11px] font-medium transition-colors ${
                  filter === item.value ? "bg-white/[0.07] text-ink" : "text-muted-foreground hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                {item.label}
                <span className="rounded-[3px] bg-white/[0.05] px-1 text-[9px] tabular text-muted-foreground">{item.count}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-[230px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search integrations…"
              className="h-7 w-full rounded-[5px] border border-line bg-surface-2 pl-8 pr-2 text-[11px] text-ink outline-none placeholder:text-muted-foreground focus:border-[#006ec3]/60"
            />
          </div>
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-2">
          {filtered.map((integration) => {
            return (
              <div key={integration.id} className="flex flex-col bg-surface-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-white p-1 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]">
                      <img
                        src={integration.logo}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink">{integration.name}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">{integration.category}</p>
                    </div>
                  </div>
                  <StatusBadge status={integration.connected ? "active" : "paused"} label={integration.connected ? "Connected" : "Available"} />
                </div>
                <p className="mt-2.5 flex-1 text-[11px] leading-relaxed text-muted-foreground">{integration.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                  <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/70">
                    {integration.connected ? <ShieldCheck className="size-2.5 text-[#83e0b3]" /> : <ExternalLink className="size-2.5" />}
                    {integration.connected ? "Syncing securely" : "OAuth 2.0"}
                  </span>
                  {integration.connected ? (
                    <button
                      type="button"
                      onClick={() =>
                        setIntegrations((current) =>
                          current.map((item) => (item.id === integration.id ? { ...item, connected: false } : item))
                        )
                      }
                      className="inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[10px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
                    >
                      {integration.managed ? "Manage" : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConnectTarget(integration)}
                      className="inline-flex h-6 items-center rounded-[4px] bg-[#006ec3] px-2 text-[10px] font-medium text-white transition-colors hover:bg-[#0a7bd4]"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[12px] text-muted-foreground">No integrations match this filter.</div>
        ) : null}
      </Panel>

      <Panel>
        <div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-line">
          <div className="border-b border-line px-4 py-3 sm:border-b-0">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Storage driver</p>
            <p className="mt-1 text-[12px] font-medium text-ink capitalize">{config.storage}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Import files and audit exports</p>
          </div>
          <div className="border-b border-line px-4 py-3 sm:border-b-0">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Email provider</p>
            <p className="mt-1 text-[12px] font-medium text-ink capitalize">{config.email}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Recall sequences and magic links</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Auth provider</p>
            <p className="mt-1 text-[12px] font-medium text-ink">{config.supabase ? "Supabase" : "Local adapter"}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Workspace authentication</p>
          </div>
        </div>
      </Panel>

      <Modal
        open={Boolean(connectTarget)}
        onClose={() => setConnectTarget(null)}
        title={connectTarget ? `Connect ${connectTarget.name}` : "Connect integration"}
        description="Paste an API key to connect this integration. Keys are stored encrypted and never shown again."
        footer={
          <>
            <button
              type="button"
              onClick={() => setConnectTarget(null)}
              className="inline-flex h-7 items-center rounded-[5px] border border-line px-2.5 text-[12px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={connect}
              disabled={!apiKey.trim()}
              className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-50"
            >
              <Check className="size-3" /> Connect
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-[#ababb2]">API key</span>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk_live_…"
            className="h-8 w-full rounded-[6px] border border-line bg-surface-2 px-2.5 font-mono text-[11px] text-ink outline-none placeholder:text-muted-foreground focus:border-[#006ec3]/60"
          />
        </label>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          This connects the integration for the current workspace only. You can revoke access at any time.
        </p>
      </Modal>
    </div>
  );
}
