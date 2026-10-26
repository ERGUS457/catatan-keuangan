export function formatRupiah(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

export function parseRupiahInput(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}

export function parseDateSafe(dateVal: string | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  const str = String(dateVal).trim();
  if (!str) return null;

  // Extract YYYY-MM-DD to avoid timezone shifts and invalid ISO concats
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const d = new Date(match[1] + "T00:00:00");
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  const d = parseDateSafe(dateStr);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string | Date | null | undefined): string {
  const d = parseDateSafe(dateStr);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
