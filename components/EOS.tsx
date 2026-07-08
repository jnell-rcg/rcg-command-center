"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RockPriority = "P0" | "P1" | "P2" | "P3";
type RockStatus = "In Progress" | "Completed" | "At Risk" | "Not Started" | "On Track" | "Off Track";

interface Rock {
  id: string;
  name: string;
  priority: RockPriority;
  status: RockStatus;
  owner: string;
  objective: string;
  targetResult: string;
  milestones: string[];
  updates?: string;
  effort?: number;
  bandwidthGain?: number;
  hoursSaved?: number;
  hoursInvested?: number;
  roi?: string;
  note?: string;
}

interface Issue {
  rank: number;
  theme: string;
  issue: string;
  impact: string;
  targetOutcome: string;
  opportunities: string[];
}

interface QAAnswer { person: string; answer: string; }
interface QAItem { question: string; answers: QAAnswer[]; }

// ─── Static RCG EOS Data ──────────────────────────────────────────────────────

const CORE_VALUES = [
  { value: "Unfiltered Transparency", desc: "that Reveals the Truth" },
  { value: "Structural Creativity",   desc: "to Build the Future" },
  { value: "Courageous Education",    desc: "to Guide with Clarity" },
  { value: "Active Partnership",      desc: "to Scale Together" },
];

const CORE_FOCUS = {
  purpose: "To level the playing field for B2B founders by arming them with the strategies, tools, and financial clarity of the world's most elite companies",
  niche: "Subscription and B2B retainer-based business models",
};

const TEN_YEAR_TARGET =
  "To engineer $10 Billion in market-exit value by equipping 500 CEOs with the Fortune 500 financial engines they need to scale fearlessly";

const THREE_UNIQUES = [
  {
    title: "The Recurring Revenue Growth",
    desc: "We don't just \"cut costs\" or \"keep books.\" We pull the three core levers — Acquisition, Retention, and Expansion — to actively engineer top-line growth and maximize your Enterprise Value.",
  },
  {
    title: "Precision Predictive Modeling",
    desc: "We provide the world's most accurate real-time cashflow forecasting. We turn your \"what-IF\" operating decisions into visible financial outcomes before you ever sign a contract or hire a body.",
  },
  {
    title: "The Exit-Ready Bridge",
    desc: "We bridge the gap from \"Back-Office Accounting\" to \"Strategic Fortune 500 Analytics.\" Every workflow we build is designed to stage your business for a high-multiple exit.",
  },
];

const PROVEN_PROCESS = [
  { step: 1, name: "Front 7 Foundations", subtitle: "Accounting",  desc: "Control the line of scrimmage — establish a clean glass baseline through high-fidelity data entry and categorization." },
  { step: 2, name: "Lockdown Coverage",   subtitle: "Controls",    desc: "Install Fortune 500-level process controls and rigid management cadences to protect the blind side." },
  { step: 3, name: "The Planning Playbook", subtitle: "Planning",  desc: "Move from defense to strategy with best-in-the-world forecasting — a dynamic 12-to-36 month roadmap." },
  { step: 4, name: "Aerial Assault",      subtitle: "Analytics",   desc: "Pull the three core subscription levers — Acquisition, Retention, and Expansion — to optimize unit economics." },
  { step: 5, name: "The Playoffs",        subtitle: "Value",       desc: "Optimize EBITDA and narrative to stage a high-multiple exit — turning the business into a legendary legacy." },
];

const ICP = {
  geographic: "Primary: North America · Secondary: English-speaking global SaaS/B2B hubs (UK, Australia, etc.)",
  demographic: [
    "Business Model: B2B Subscription, SaaS, or Retainer-based agencies",
    "Revenue Size: $3M – $10M",
    "Team Size: 10–50 employees",
    "Tech Stack: QB/Xero + Stripe/Chargebee + HubSpot/Salesforce",
  ],
  psychographic: [
    "\"Product-First\" but \"Finance-Last\" CEOs",
    "Feel like they're guessing on hiring and spend decisions",
    "Actively looking to scale to an 8-figure exit within 3–5 years",
    "Value Wisdom and Partnership over \"cheap compliance\"",
  ],
  refinedList: [
    "Founders of VC/Angel-backed B2B SaaS who just hit Series A",
    "Agency Owners transitioning from project-based to high-ticket retainers",
    "Bootstrapped B2B Founders who have hit a \"revenue ceiling\" at $2M–$3M",
  ],
  antiTarget: [
    "E-commerce (unless subscription-heavy)",
    "Brick-and-mortar or heavy inventory",
    "\"Lifestyle\" business owners with no intention of scaling or exiting",
    "Businesses under $2M revenue with massive transaction volume",
  ],
};

// ─── Q3 2026 Rocks ────────────────────────────────────────────────────────────

interface Q3Rock {
  id: string;
  owner: string;
  name: string;
  quarter: string;
  status: "On Track" | "At Risk" | "Off Track";
  description: string;
}

const Q3_ROCKS: Q3Rock[] = [
  {
    id: "q3-rick-cfo-course",
    owner: "Rick",
    name: "CFO Course Launch",
    quarter: "Q3 2026",
    status: "On Track",
    description: "Design and launch a paid coaching program for fractional CFOs and finance leaders. Enroll the first 6 prospects. Productizes Rick's expertise and opens a new revenue lane outside of client services.",
  },
  {
    id: "q3-janelle-ai-infra",
    owner: "Janelle",
    name: "AI Agent Infrastructure",
    quarter: "Q3 2026",
    status: "On Track",
    description: "Build and deploy RCG's core AI agent stack: Ops Tower (team-wide access), Month-End Close Commentary Agent (shared API key, Railway deploy), and AI CFO/Raven (QBO integration via Noah's connector). Establish one-owner-per-tool model.",
  },
  {
    id: "q3-zack-revenue-brand",
    owner: "Zack",
    name: "Revenue & Brand Growth",
    quarter: "Q3 2026",
    status: "On Track",
    description: "Own LinkedIn and Twitter content channels to build RCG's brand and inbound pipeline. Support the CFO coaching program launch with marketing. Drive biweekly sales/pipeline updates at All Hands.",
  },
  {
    id: "q3-maria-delivery",
    owner: "Maria",
    name: "Delivery Efficiency — 10-Day Close",
    quarter: "Q3 2026",
    status: "On Track",
    description: "Reduce month-end close cycle to 10 days across all clients. Standardize the accounting-to-FP&A bridge, enforce the no-PDF/Excel-only data standard, and build a repeatable MEC workflow that Maria oversees rather than executes.",
  },
];

// ─── Q2 Rocks ─────────────────────────────────────────────────────────────────

const Q2_ROCKS: Rock[] = [
  {
    id: "r-handoff-reporting",
    name: "Handoff Reporting & Modeling Responsibilities",
    priority: "P0",
    status: "In Progress",
    owner: "Rick + Dept Heads",
    objective: "Scale Bandwidth",
    note: "Foundational — everything else depends on this",
    targetResult: "Rick no longer involved in day-to-day reporting. Analyst owns weekly reporting + ops plan updates. Rick oversees only.",
    milestones: [
      "Reporting template finalized and distributed",
      "Weekly reporting cadence established",
      "Rick removed from day-to-day reporting workflows",
      "Complete inventory tracker exercise",
      "Weekly modeling hour launched",
    ],
    updates: "Brandon modeling hour launched; all team invited for skill-building. Rick inventorying existing models to support handoff/training. Goal: remove Rick from daily modeling/reporting work.",
    effort: 2,
    bandwidthGain: 3,
    hoursSaved: 9,
    hoursInvested: 10,
    roi: "400%",
  },
  {
    id: "r-tool-automation",
    name: "Tool Automation (Coefficient / QB→Excel / Reconciliation)",
    priority: "P0",
    status: "In Progress",
    owner: "Rick",
    objective: "Scale Bandwidth",
    note: "Enables Analyst, removes manual work, gives clean data",
    targetResult: "Reporting is automated and consistent. All existing client ops plans converted. QB to Excel integration live. Reporting outputs validated.",
    milestones: [
      "Select tool: CData vs. OBO Advanced ($237/mo/co) vs. Coefficient Alternative",
      "QB to Excel integration live",
      "Automate core reporting outputs",
      "Standardize and ramify model templates across all clients",
      "Validate all reporting outputs",
    ],
    updates: "CData doesn't connect. OBO Advanced at $237/mo per company. Coefficient Alternative pricing per team member/month/client.",
    effort: 3,
    hoursSaved: 77,
    hoursInvested: 77,
  },
  {
    id: "r-itemize-cfo",
    name: "Itemize CFO Function for Clients",
    priority: "P1",
    status: "In Progress",
    owner: "Janelle",
    objective: "Scale Bandwidth",
    note: "Removes bottleneck for Rick — defines who does what inside the sprint",
    targetResult: "Standardized CFO sprint that enables team-led delivery and removes Rick from day-to-day execution.",
    milestones: [
      "Define core CFO functions (cleanup, modeling, reporting, strategy)",
      "Assign ownership per function: Maria = cleanup, Analyst = modeling/reporting, Rick = CFO layer",
      "Rick maps CFO process/activity inventory",
      "Pricing direction shifting toward retainer-first structure",
      "Client-facing sprint roadmap used in onboarding and delivery",
      "Standardize deliverables per function",
      "Noah's AI tool integrated into onboarding cadence",
    ],
    updates: "Defines what the work is. Rick to map CFO process/activity inventory. Consolidates with Redesigning the Sprint rock.",
    effort: 3,
    bandwidthGain: 3,
  },
  {
    id: "r-redesign-sprint",
    name: "Redesign the Sprint",
    priority: "P1",
    status: "In Progress",
    owner: "Rick + Janelle",
    objective: "Scale Bandwidth",
    note: "Improves delivery. Important, but downstream of sales",
    targetResult: "Standardized 6-Week Sprint inside the existing retainer — consistent delivery and clear expectations across all clients.",
    milestones: [
      "Map sprint steps in dependency order (not just by week)",
      "Identify what must happen first vs. can run in parallel",
      "Translate dependency flow into 6–8 week sprint structure",
      "Create client-facing roadmap inside retainer model",
      "Retainer-first delivery model confirmed",
    ],
    updates: "Sprint to be built in dependency order, not just by week. Retainer-first delivery model confirmed.",
    effort: 2,
    bandwidthGain: 3,
  },
  {
    id: "r-redesign-sales",
    name: "Redesign Sales Process",
    priority: "P2",
    status: "In Progress",
    owner: "Rick + Zack",
    objective: "Increase Sales",
    note: "Drives Revenue and Clarity. Can run in parallel. Doesn't block ops foundation.",
    targetResult: "Improved client quality and reduced founder dependency in sales. All leads pre-qualified before Rick involvement. Standardized offer used across all new deals.",
    milestones: [
      "$3M+ ARR, SaaS/Subscription focus — no exceptions",
      "Standardize discovery framework: diagnose → quantify gap → product (no custom consulting)",
      "Implement Sales → Ops handoff gate (Noah's AI Agent)",
    ],
    updates: "Rick rewrote sales discovery & offer over the weekend. Started building Homeworks in Claude.",
    effort: 4,
  },
  {
    id: "r-analyst-tracker",
    name: "Analyst Progression Tracker",
    priority: "P2",
    status: "In Progress",
    owner: "Rick + Maria",
    objective: "Scale Bandwidth",
    note: "Depends on clean data (P1)",
    targetResult: "Brandon operates as primary analyst with reduced accounting load.",
    milestones: [
      "Transition Brandon from full accounting to reporting hybrid",
      "Assign ownership of reporting + ops plan update to Brandon",
      "Brandon owns model inventory for training use",
      "Track outputs weekly",
    ],
    updates: "Awaiting Emanary project close. Weekly modeling hour supports Brandon progression. Rick beginning model inventory for training.",
  },
  {
    id: "r-pricing-model",
    name: "Pricing Model Improvement",
    priority: "P2",
    status: "In Progress",
    owner: "Rick + Maria",
    objective: "Improve Pricing Clarity",
    targetResult: "New pricing model in use across all new clients, aligned with margin and positioning goals.",
    milestones: [
      "Define updated pricing tiers (sprint + retainer OR retainer-first)",
      "Align pricing with ICP ($100k–$250k MRR client)",
      "Establish margin targets per service tier",
      "Apply new pricing to all new deals",
    ],
    updates: "Rick wants bookkeeping + CFO more compartmentalized in pricing. Retainer-first approach confirmed — away from one-time upfront sprint pricing. Noah pricing structure largely supports direction.",
    effort: 1,
    bandwidthGain: 0,
    hoursSaved: 0,
  },
  {
    id: "r-weekly-cadence",
    name: "Establish Weekly Operating Cadence",
    priority: "P2",
    status: "In Progress",
    owner: "Janelle",
    objective: "EOS Rhythm",
    note: "Not last, but apply as we go",
    targetResult: "Consistent weekly operating cadence with clear priorities, ownership, and visibility across leadership.",
    milestones: [
      "30-minute weekly leadership meeting cadence established",
      "EOS rocks used as standing review structure in weekly meetings",
      "Recurring owners and accountability confirmed for each active rock",
      "Meeting flow standardized: priorities → blockers → updates → next actions",
      "Reduce unnecessary meeting time while maintaining team visibility",
    ],
    updates: "Fewer meetings. Tighter meetings. Leadership visibility. EOS rhythm actually being used, not just discussed.",
  },
  {
    id: "r-digital-product",
    name: "Digital Product Design (Skool / CEO-as-CFO)",
    priority: "P3",
    status: "In Progress",
    owner: "Rick, Janelle, Alex",
    objective: "Increase Sales",
    targetResult: "Course/design curriculum for Skool. CEO as CFO content repository built.",
    milestones: [
      "Course/curriculum design (Skool) — CEO as CFO",
      "Content collected in repository",
    ],
    updates: "",
    effort: 4,
    bandwidthGain: 2,
  },
  {
    id: "r-split-accounting",
    name: "Split Accounting Function",
    priority: "P1",
    status: "Completed",
    owner: "Maria",
    objective: "Scale Bandwidth",
    targetResult: "Clear separation between cleanup and ongoing accounting, with Maria operating in oversight vs. execution.",
    milestones: [
      "Team members assigned to each function",
      "Maria in oversight role",
      "Standard cleanup workflow documented",
    ],
    updates: "✅ Completed. Split accounting vs. cleanup confirmed. Standard workflow documented.",
  },
];

// ─── Issues List ──────────────────────────────────────────────────────────────

const ISSUES: Issue[] = [
  {
    rank: 1,
    theme: "Founder Dependency — The \"Rick\" Bottleneck",
    issue: "Rick is the single point of failure for delivery and client communications. All escalations, deliverables, and decisions flow through him.",
    impact: "Time spent on models and analytics cannibalizes the $1.5M revenue engine. Growth is capped by one person's bandwidth.",
    targetOutcome: "Rick exits the \"weeds\" of deliverables to focus exclusively on high-level Growth and Strategy.",
    opportunities: [
      "Rick moves exclusively into sales and marketing",
      "Analyst owns all delivery and reporting",
      "Clear escalation path — Rick only touches strategic decisions",
      "Team-led client relationships with Rick as executive sponsor only",
    ],
  },
  {
    rank: 2,
    theme: "Model Inconsistency — The SaaS/Scale Filter",
    issue: "Weak-fit clients (<$3M ARR, non-SaaS, or one-off models) create a \"too wide\" client mix that can't be systematized.",
    impact: "Every non-SaaS client requires \"reinventing the wheel,\" which destroys Gross Margin and exhausts the team's mental calories.",
    targetOutcome: "100% of new intakes is SaaS/Subscription only. A single, scalable modeling template applied to all clients.",
    opportunities: [
      "Business Owner (BO) qualification role before Rick is ever involved",
      "Redesign Sales Script and Process around ICP-only filter",
      "More targeted marketing — ICP-only messaging and ad targeting",
    ],
  },
  {
    rank: 3,
    theme: "The Onboarding Gate — Sales vs. Accounting",
    issue: "Accounting is \"out of the know\" of the sales pipeline, leading to \"fire drill\" onboarding and chronic data delays.",
    impact: "High friction during onboarding leads to late starts, late billing, and reactive instead of proactive service delivery.",
    targetOutcome: "Mandatory \"Sales-to-Ops\" handover 7 days before close. Zero-circumvention automated gate for data access.",
    opportunities: [
      "Accounting seat at the table during every sales sprint intake",
      "Noah's AI Agent for automated client assessment at intake",
      "Automated onboarding checklist — nothing starts without it",
    ],
  },
  {
    rank: 4,
    theme: "Delivery Rework — Accounting / FP&A Bridge",
    issue: "Lack of sync between Accounting (MEC) and FP&A. Team manually extracts data from PDFs while Eric performs rework on ops plans.",
    impact: "Team loses hours on manual data cleanup. Ops plans are often inaccurate due to post-close accounting changes.",
    targetOutcome: "A standardized \"Bridge\" process where Accounting, FP&A, and the Client are aligned on a single CFO Commentary + Cash Forecast.",
    opportunities: [
      "Analyst owns model updates after every month-end close",
      "Upload budgets into QB — single source of truth",
      "QB to Excel direct integration via Coefficient",
      "Explore FP&A tools and data rails",
      "Accounting reconciliation automation (Zapier)",
    ],
  },
  {
    rank: 5,
    theme: "Authority Gap — Service-Taker vs. Advisor",
    issue: "The team accommodates client whims (PDFs, messy data, out-of-scope requests) rather than asserting the RCG standard.",
    impact: "Clients dictate the workflow, leading to scope creep, repeated process explanations, and diluted professional authority.",
    targetOutcome: "The \"RCG Proven Process\" — non-negotiable standards clients must follow to receive service (e.g., Excel only, no PDFs).",
    opportunities: [
      "New Pricing Tiers for accounting & FP&A sold separately",
      "Total rewrite of the Sprint as Our Process — not the client's",
      "Client onboarding education and homework required before work begins",
      "Deliverables-focused delivery first, then client education layer",
    ],
  },
  {
    rank: 6,
    theme: "Revenue Leakage — Pricing & Billing",
    issue: "Billing is delayed or doesn't reflect the frantic work done on platform data, manual cleanup, or out-of-scope requests.",
    impact: "Providing \"CFO-level\" consulting at \"bookkeeping\" prices hurts cash flow and chronically undervalues the team's expertise.",
    targetOutcome: "Tiered Service Levels with upfront retainer billing. Automatic \"Data Cleanup Fee\" applied for messy or non-standard inputs.",
    opportunities: [
      "Jump straight into Retainer (no sprint, 3-month minimum guarantee)",
      "Speed to complete sprint placed on the client, not RCG",
      "Bill retainer upfront — CFO + Accounting only after payment received",
      "Margin targets established and enforced per service tier",
    ],
  },
  {
    rank: 7,
    theme: "Lead Quality Mismatch — Top-of-Funnel Dilution",
    issue: "Paid acquisition is driving a high volume of sub-$3M ARR founders who are not qualified for RCG's core CFO services.",
    impact: "Sales time wasted on unqualified prospects, increasing CAC and creating distraction from high-value client relationships.",
    targetOutcome: "Dual-path funnel: $3M–$25M ARR prospects → RCG core services. Sub-$3M founders → productized AI CFO / SaaS offer for monetization and future graduation.",
    opportunities: [
      "Build a SaaS product and AI CFO offering for the sub-$3M segment",
      "Paid ads retargeted to ICP-only ($3M+ ARR criteria)",
      "Organic content funnel for sub-$3M nurture and graduation pipeline",
    ],
  },
  {
    rank: 8,
    theme: "AI CFO + $kool Community — Monetizing the Sub-$3M Segment",
    issue: "RCG lacks a productized offering for sub-$3M ARR clients — forcing a choice between turning away leads or taking on low-quality, high-effort clients.",
    impact: "Wasted paid acquisition spend. Founder time diluted across low-value prospects. Forces \"reinventing the wheel\" for smaller clients. Missed LTV from future high-value clients.",
    targetOutcome: "Build and launch a Productized $kool Community: Financial Education + Standardized templates/models + Graduation pipeline → core CFO services.",
    opportunities: [
      "$kool-based community (education + accountability)",
      "Standardize the financial system for sub-$3M founders",
      "Productized monthly subscription model",
      "Lead qualification + warming engine before RCG intake",
      "Upsell path: $kool → Sprint → Retainer",
    ],
  },
];

// ─── Leadership Q&A ───────────────────────────────────────────────────────────

const LEADERSHIP_QA: QAItem[] = [
  {
    question: "What is the primary outcome your department is accountable for?",
    answers: [
      { person: "Rick",    answer: "Develop a high-performing team and ensure every client receives exceptional deliverables that drive measurable growth and results. Acquire and retain high-quality clients while clearly communicating and delivering the strategic value of RCG Financial." },
      { person: "Janelle", answer: "Repeatable client lifecycle without founder bottleneck. Open question: personal brand vs. team brand for Marketing." },
      { person: "Maria",   answer: "Provide cleaner financials at the end of the day for the 'Why?' — Accounting bridge to FP&A." },
      { person: "Eric",    answer: "Accurate Ops Plan — making sure clients understand what we are trying to tell them. More client buy-in during the sprint." },
    ],
  },
  {
    question: "What are the three biggest constraints currently slowing RCG's growth?",
    answers: [
      { person: "Rick",    answer: "1. Client access and support to complete sprints. 2. Team capacity across multiple projects. 3. Unproductive time on unprofitable and weak-fit clients." },
      { person: "Janelle", answer: "1. Rick too central to delivery and comms. 2. Scope strain — taking on too many additional responsibilities we don't do. 3. Too wide of a client mix." },
      { person: "Maria",   answer: "1. Client Access. 2. Process Automation — tech stack/templates. 3. Friction on client onboardings." },
      { person: "Eric",    answer: "1. Bookkeeping access (SaaS books completed). 2. Industry value — unique solutions per industry. 3. Accommodating to client needs rather than asserting \"This is how finance is done.\"" },
    ],
  },
  {
    question: "If we had to double revenue in 12 months, what must change? ($1.5M target)",
    answers: [
      { person: "Rick",    answer: "1. Fully automated marketing engine. 2. More efficient sales process. 3. More support under executive leadership." },
      { person: "Janelle", answer: "1. Rick out of meetings and deliverables entirely. 2. Onboarding must set expectations — ZERO room for circumvention. 3. Intake is SaaS/subscription biz models only." },
      { person: "Eric",    answer: "1. Internal training in FP&A for financial modeling. 2. Standardized deliverables — CFO commentary on MEC, Cash reforecast & levers. 3. Charge bookkeeping by tiers with AI audit. 4. Charge for reporting capabilities separately." },
      { person: "Maria",   answer: "1. Client access. 2. Process Automation — tech stack/templates. 3. Charge bookkeeping by tiers." },
    ],
  },
  {
    question: "What is one thing we should STOP doing immediately as a company?",
    answers: [
      { person: "Rick",    answer: "Kill any new bookkeeping-only clients and clients not earning $3M+ a year." },
      { person: "Janelle", answer: "1. Accepting non-recurring revenue biz models. 2. Late access points — no work starts until data is provided. 3. No work started until payment received." },
      { person: "Maria",   answer: "Keeping accounting out of the know of the sales pipeline." },
      { person: "Eric",    answer: "Stop waiting to bill the retainer. If anything is delayed, it's on THEM. Should we bill retainer only upfront and only do CFO + Accounting?" },
    ],
  },
  {
    question: "Where is your team spending time that doesn't directly move your primary outcome?",
    answers: [
      { person: "Rick",    answer: "Updating client models and analytics gets in the way of sales and marketing. All of this should be offset to an analyst." },
      { person: "Janelle", answer: "Cash reforecast calls could be wrapped at end of MEC or replaced with a written report (freeing up meeting time). RCG often re-explaining process instead of enforcing written expectations." },
      { person: "Maria",   answer: "1. Diving into platform data/transaction history too long before escalating to client or support. 2. Scheduling meetings with wrong points of contact. 3. Extracting data from PDFs because clients didn't provide Excel format." },
      { person: "Eric",    answer: "1. Accounting changes after month close requiring ops plan rework. 2. Post month-end close review changes to ops plan and re-updating — a repeated rework cycle." },
    ],
  },
];

// ─── Priority helpers ─────────────────────────────────────────────────────────

function priorityStyle(p: RockPriority | "Completed") {
  const map = {
    P0:        { border: "border-red-300",    bg: "bg-red-50",       badge: "bg-red-600 text-white",     dot: "bg-red-500",    label: "P0 — Critical" },
    P1:        { border: "border-orange-200", bg: "bg-orange-50",    badge: "bg-orange-500 text-white",  dot: "bg-orange-500", label: "P1 — High" },
    P2:        { border: "border-amber-200",  bg: "bg-amber-50",     badge: "bg-amber-500 text-white",   dot: "bg-amber-400",  label: "P2 — Medium" },
    P3:        { border: "border-green-200",  bg: "bg-green-50",     badge: "bg-green-600 text-white",   dot: "bg-green-500",  label: "P3 — Standard" },
    Completed: { border: "border-slate-200",  bg: "bg-slate-50",     badge: "bg-slate-400 text-white",   dot: "bg-slate-400",  label: "Completed" },
  };
  return map[p];
}

const PERSON_COLOR: Record<string, string> = {
  Rick:    "bg-teal-50 text-teal-700",
  Janelle: "bg-orange-100 text-orange-700",
  Maria:   "bg-violet-100 text-violet-700",
  Eric:    "bg-blue-100 text-blue-700",
};

// ─── Q3 Rock Card ─────────────────────────────────────────────────────────────

const Q3_STATUS_STYLE = {
  "On Track":  { border: "border-emerald-200", bg: "bg-emerald-50",  badge: "bg-emerald-600 text-white",  dot: "bg-emerald-500" },
  "At Risk":   { border: "border-amber-200",   bg: "bg-amber-50",    badge: "bg-amber-500 text-white",    dot: "bg-amber-400"   },
  "Off Track": { border: "border-red-300",     bg: "bg-red-50",      badge: "bg-red-600 text-white",      dot: "bg-red-500"     },
};

function Q3RockCard({ rock }: { rock: Q3Rock }) {
  const style = Q3_STATUS_STYLE[rock.status];
  const ownerColor = PERSON_COLOR[rock.owner] ?? "bg-slate-100 text-slate-600";

  return (
    <div className={`rounded-xl border ${style.border} overflow-hidden shadow-sm`}>
      <div className={`${style.bg} px-4 py-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                {rock.status}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {rock.quarter}
              </span>
            </div>
            <p className="text-sm font-bold leading-snug text-slate-900">{rock.name}</p>
          </div>
          <span className={cn("flex-shrink-0 self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold", ownerColor)}>
            {rock.owner}
          </span>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-700">{rock.description}</p>
      </div>
    </div>
  );
}

// ─── Rock Card ────────────────────────────────────────────────────────────────

function RockCard({ rock }: { rock: Rock }) {
  const [showUpdates, setShowUpdates] = useState(false);
  const key = rock.status === "Completed" ? "Completed" : rock.priority;
  const style = priorityStyle(key);
  const done = rock.status === "Completed";

  return (
    <div className={`rounded-xl border ${style.border} overflow-hidden shadow-sm`}>
      {/* Header bar */}
      <div className={`${style.bg} px-4 py-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                {style.label}
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                done            ? "bg-emerald-100 text-emerald-700" :
                rock.status === "At Risk" ? "bg-red-100 text-red-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {rock.status}
              </span>
              {rock.objective && (
                <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {rock.objective}
                </span>
              )}
            </div>
            <p className={cn("text-sm font-bold leading-snug", done ? "text-slate-400 line-through" : "text-slate-900")}>
              {rock.name}
            </p>
            {rock.note && <p className="mt-0.5 text-[11px] italic text-slate-400">{rock.note}</p>}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[11px] font-medium text-slate-600">{rock.owner}</p>
            {rock.roi && <p className="text-[10px] font-bold text-emerald-600 mt-0.5">ROI: {rock.roi}</p>}
          </div>
        </div>

        {/* Metrics dots */}
        {(rock.effort !== undefined || (rock.bandwidthGain !== undefined && rock.bandwidthGain > 0) || (rock.hoursSaved !== undefined && rock.hoursSaved > 0)) && (
          <div className="mt-2 flex flex-wrap gap-4">
            {rock.effort !== undefined && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span>Effort</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (rock.effort ?? 0) ? "bg-slate-500" : "bg-slate-200"}`} />
                  ))}
                </div>
              </div>
            )}
            {rock.bandwidthGain !== undefined && rock.bandwidthGain > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span>BW Gain</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (rock.bandwidthGain ?? 0) ? "bg-emerald-500" : "bg-slate-200"}`} />
                  ))}
                </div>
              </div>
            )}
            {rock.hoursSaved !== undefined && rock.hoursSaved > 0 && (
              <span className="text-[10px] text-slate-500">
                <span className="font-bold text-emerald-600">{rock.hoursSaved}h</span>/wk saved
              </span>
            )}
            {rock.hoursInvested !== undefined && rock.hoursInvested > 0 && (
              <span className="text-[10px] text-slate-500">
                <span className="font-bold text-slate-600">{rock.hoursInvested}h</span>/wk invested
              </span>
            )}
          </div>
        )}
      </div>

      {/* Target result */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Result This Quarter</p>
        <p className="text-xs text-slate-700 leading-relaxed">{rock.targetResult}</p>
      </div>

      {/* Milestones */}
      {rock.milestones.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Milestones</p>
          <ul className="space-y-1.5">
            {rock.milestones.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Updates — collapsible */}
      {rock.updates && (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            onClick={() => setShowUpdates((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className={`h-3 w-3 flex-shrink-0 transition-transform ${showUpdates ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Latest updates
          </button>
          {showUpdates && (
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{rock.updates}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Issue Card ───────────────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: Issue }) {
  const [expanded, setExpanded] = useState(false);
  const rankBadge =
    issue.rank <= 2 ? "bg-red-600 text-white" :
    issue.rank <= 4 ? "bg-orange-500 text-white" :
    issue.rank <= 6 ? "bg-amber-500 text-white" :
    "bg-slate-500 text-white";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${rankBadge}`}>
          {issue.rank}
        </span>
        <p className="text-sm font-bold text-slate-900">{issue.theme}</p>
      </div>

      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-slate-100">
        <div className="px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Issue</p>
          <p className="text-xs text-slate-700 leading-relaxed">{issue.issue}</p>
        </div>
        <div className="px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-red-400">Impact</p>
          <p className="text-xs text-slate-700 leading-relaxed">{issue.impact}</p>
        </div>
        <div className="px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Target Outcome</p>
          <p className="text-xs text-slate-700 leading-relaxed">{issue.targetOutcome}</p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className={`h-3 w-3 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Opportunities &amp; Next Steps ({issue.opportunities.length})
        </button>
        {expanded && (
          <ul className="mt-2 space-y-1.5">
            {issue.opportunities.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                {o}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Rocks Tab ────────────────────────────────────────────────────────────────

function RocksTab() {
  const [showQ2, setShowQ2] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const active    = Q2_ROCKS.filter((r) => r.status !== "Completed");
  const completed = Q2_ROCKS.filter((r) => r.status === "Completed");

  const groups: Record<RockPriority, Rock[]> = { P0: [], P1: [], P2: [], P3: [] };
  active.forEach((r) => groups[r.priority].push(r));

  return (
    <div className="space-y-8">

      {/* ── Q3 2026 ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            Q3 2026
          </span>
          <span className="text-xs text-slate-400">— {Q3_ROCKS.length} rocks</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Q3_ROCKS.map((r) => <Q3RockCard key={r.id} rock={r} />)}
        </div>
      </div>

      {/* ── Q2 2026 (collapsible) ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setShowQ2((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="rounded-full bg-slate-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              Q2 2026
            </span>
            <span>— {Q2_ROCKS.length} rocks</span>
            <svg className={`h-3 w-3 transition-transform ${showQ2 ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {showQ2 && (
          <div className="space-y-8">
            {(["P0", "P1", "P2", "P3"] as RockPriority[]).map((p) => {
              const rocks = groups[p];
              if (!rocks.length) return null;
              const style = priorityStyle(p);
              return (
                <div key={p}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-slate-400">— {rocks.length} rock{rocks.length !== 1 ? "s" : ""}</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>
                  <div className="space-y-3">
                    {rocks.map((r) => <RockCard key={r.id} rock={r} />)}
                  </div>
                </div>
              );
            })}

            {completed.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={() => setShowCompleted((v) => !v)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="rounded-full bg-slate-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      Completed
                    </span>
                    <span>— {completed.length} rock{completed.length !== 1 ? "s" : ""}</span>
                    <svg className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="flex-1 border-t border-slate-200" />
                </div>
                {showCompleted && (
                  <div className="space-y-3">
                    {completed.map((r) => <RockCard key={r.id} rock={r} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Issues Tab ───────────────────────────────────────────────────────────────

function IssuesTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">IDS — Identify, Discuss, Solve.</span>{" "}
        These are the strategic issues currently blocking RCG&apos;s growth. Ranked by urgency. Each issue has a documented Impact and Target Outcome.
      </div>
      {ISSUES.map((issue) => <IssueCard key={issue.rank} issue={issue} />)}
    </div>
  );
}

// ─── V/TO Tab ─────────────────────────────────────────────────────────────────

function VTOTab() {
  return (
    <div className="space-y-5">
      {/* Core Values */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">1. Core Values</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CORE_VALUES.map((v) => (
            <div key={v.value} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-900">{v.value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Core Focus */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">2. Core Focus</p>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Purpose / Cause / Passion</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">{CORE_FOCUS.purpose}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Niche</p>
            <p className="mt-1 text-sm text-slate-700">{CORE_FOCUS.niche}</p>
          </div>
        </div>
      </div>

      {/* 10-Year Target */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">3. 10-Year Target (BHAG)</p>
        <p className="text-base font-bold leading-snug text-slate-900">{TEN_YEAR_TARGET}</p>
      </div>

      {/* 3 Uniques */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">4. Three Uniques</p>
        <div className="space-y-4">
          {THREE_UNIQUES.map((u, i) => (
            <div key={u.title} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{u.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proven Process */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">5. Proven Process</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {PROVEN_PROCESS.map((step) => (
            <div key={step.step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                  {step.step}
                </span>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{step.subtitle}</p>
              </div>
              <p className="text-xs font-bold text-slate-900">{step.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Target Market */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">6. Target Market — The List</p>
        <p className="mb-3 text-xs text-slate-500">{ICP.geographic}</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Demographic</p>
            <ul className="space-y-1">
              {ICP.demographic.map((d) => (
                <li key={d} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />{d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Psychographic</p>
            <ul className="space-y-1">
              {ICP.psychographic.map((d) => (
                <li key={d} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />{d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-teal-600">✓ Refined Target Segments</p>
            <ul className="space-y-1">
              {ICP.refinedList.map((d) => (
                <li key={d} className="flex items-start gap-1.5 text-xs font-medium text-teal-700">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-teal-500" />{d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-red-400">✗ Anti-Target</p>
            <ul className="space-y-1">
              {ICP.antiTarget.map((d) => (
                <li key={d} className="flex items-start gap-1.5 text-xs text-red-600">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-red-400" />{d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

function InsightsTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Leadership Planning Session.</span>{" "}
        Answers from the RCG team — these insights directly inform our Rocks and Issues list.
      </div>
      {LEADERSHIP_QA.map((qa, qi) => (
        <div key={qi} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 bg-slate-800 px-4 py-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
              {qi + 1}
            </span>
            <p className="text-sm font-semibold leading-snug text-white">{qa.question}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {qa.answers.map((a) => (
              <div key={a.person} className="flex gap-3 px-4 py-3">
                <span className={cn("flex-shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-bold", PERSON_COLOR[a.person] ?? "bg-slate-100 text-slate-600")}>
                  {a.person}
                </span>
                <p className="text-xs leading-relaxed text-slate-700">{a.answer}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main EOS ─────────────────────────────────────────────────────────────────

type TabId = "rocks" | "issues" | "vto" | "insights";

const TABS: { id: TabId; label: string; count?: number }[] = [
  { id: "rocks",    label: "Rocks",               count: Q3_ROCKS.length + Q2_ROCKS.filter((r) => r.status !== "Completed").length },
  { id: "issues",   label: "Issues (IDS)",        count: ISSUES.length },
  { id: "vto",      label: "V/TO" },
  { id: "insights", label: "Leadership Insights" },
];

export function EOS() {
  const [tab, setTab] = useState<TabId>("rocks");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: "#0d2b2a" }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Entrepreneurial Operating System</p>
              <h1 className="mt-0.5 text-xl font-bold text-white">RCG Financial — EOS Dashboard</h1>
              <p className="mt-0.5 text-sm text-white/50">
                Q3 2026 · {Q3_ROCKS.length} Active Rocks · {ISSUES.length} Strategic Issues
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wide text-white/30">10-Year Target</p>
              <p className="mt-0.5 max-w-[180px] text-right text-xs font-semibold leading-snug text-white/60">
                $10B market-exit value · 500 CEOs equipped
              </p>
            </div>
          </div>
          {/* Core value chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CORE_VALUES.map((v) => (
              <span key={v.value} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/70">
                {v.value}
              </span>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-white/10 px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-4 py-3 text-xs font-semibold transition-colors",
                tab === t.id ? "text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                  tab === t.id ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                )}>
                  {t.count}
                </span>
              )}
              {tab === t.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-orange-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "rocks"    && <RocksTab />}
      {tab === "issues"   && <IssuesTab />}
      {tab === "vto"      && <VTOTab />}
      {tab === "insights" && <InsightsTab />}
    </div>
  );
}
