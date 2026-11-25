// Evita que o Excel interprete texto como fórmula (=, +, -, @)
export const safeText = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
