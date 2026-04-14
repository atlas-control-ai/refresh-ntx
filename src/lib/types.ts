export type DistributionStatus = "pending" | "picked_up" | "school_delivered" | "binned" | "not_fulfilled" | "exception";

export function effectivePackCode(enrollment: { pack_code_calculated: string; pack_code_override: string | null }): string {
  return enrollment.pack_code_override ?? enrollment.pack_code_calculated;
}

export const TRUST_LEVELS = { UNTRUSTED: 0, SOFT_TRUSTED: 1, CONFLICT_FLAGGED: 2, VERIFIED: 3 } as const;

export function trustLevelLabel(level: number): string {
  switch (level) {
    case 0: return "Untrusted";
    case 1: return "Soft Trusted";
    case 2: return "Conflict";
    case 3: return "Verified";
    default: return "Unknown";
  }
}

export function trustLevelColor(level: number): string {
  switch (level) {
    case 0: return "bg-zinc-100 text-zinc-600";
    case 1: return "bg-blue-100 text-blue-700";
    case 2: return "bg-amber-100 text-amber-700";
    case 3: return "bg-green-100 text-green-700";
    default: return "bg-zinc-100 text-zinc-600";
  }
}

export function isDistributionCompleted(status: string): boolean {
  return ["picked_up", "school_delivered", "binned"].includes(status);
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  picked_up: "Picked Up",
  school_delivered: "School Delivery",
  binned: "Binned",
  not_fulfilled: "Not Fulfilled",
  exception: "Exception",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  picked_up: "bg-green-100 text-green-700",
  school_delivered: "bg-blue-100 text-blue-700",
  binned: "bg-amber-100 text-amber-700",
  not_fulfilled: "bg-red-100 text-red-700",
  exception: "bg-purple-100 text-purple-700",
};

export const SEASONS = ["aug", "nov", "feb", "may"] as const;
export const SEASON_LABELS: Record<string, string> = {
  aug: "August", nov: "November", feb: "February", may: "May",
};
export const SEASON_SHORT: Record<string, string> = {
  aug: "Aug", nov: "Nov", feb: "Feb", may: "May",
};
