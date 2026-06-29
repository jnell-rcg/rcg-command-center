export type Priority = "High" | "Medium" | "Low";
export type Owner = "Rick" | "Janelle" | "Zack" | "Unassigned";
export type Category =
  | "Client Response Needed"
  | "Internal Action Item"
  | "EOS / Accountability"
  | "Payroll & HR"
  | "Month-End Close"
  | "Deadline / Follow-up"
  | "New Lead / Sales"
  | "Missing / Overdue Item";

export type Source =
  | "Gmail"
  | "Calendar"
  | "Slack"
  | "Fathom"
  | "WhatsApp"
  | "Dropbox"
  | "Manual";

export interface ActionItem {
  id: string;
  source: Source;
  summary: string;
  actionItem: string;
  owner: Owner;
  client: string;
  priority: Priority;
  category: Category;
  dueDate?: string;       // ISO date string if mentioned
  isOverdue: boolean;
  rawContext?: string;    // snippet of source text for reference
  notes?: string;         // research / reference notes (collapsible on card)
  createdAt: string;      // ISO timestamp
  completed?: boolean;    // true when user marks done — filtered at source before returning to client
}

export interface ClassifyRequest {
  source: Source;
  text: string;
}

export interface ClassifyResponse {
  items: Omit<ActionItem, "id" | "createdAt" | "isOverdue">[];
}
