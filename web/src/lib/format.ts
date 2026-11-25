export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (iso: string) =>
  iso.slice(0, 10).split("-").reverse().join("/");

export const inputClass =
  "rounded-lg bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500";

export const typeColor = (type: "INCOME" | "EXPENSE") =>
  type === "INCOME" ? "#22c55e" : "#ef4444";

// Data local (não UTC), no formato AAAA-MM-DD
export const today = () => new Date().toLocaleDateString("sv-SE");

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export const toIso = (br: string) => br.split("/").reverse().join("-");
