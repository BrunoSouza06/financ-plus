export const toDate = (d: string) => new Date(`${d}T00:00:00.000Z`);

// Só é válida se o JS não "corrigiu" a data (ex: 31/02 virar 03/03)
export const isRealDate = (d: string) => {
  const date = toDate(d);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === d;
};

export const addMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
};

// Dia 31 em mês curto vira o último dia do mês
export const dateFor = (month: string, day: number) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
};

// Lançamentos de uma recorrência que ainda precisam ser criados, até hoje
export function pendingOccurrences(
  startMonth: string,
  lastGenerated: string | null,
  dayOfMonth: number,
  todayStr: string,
) {
  const currentMonth = todayStr.slice(0, 7);
  let month = lastGenerated ? addMonth(lastGenerated) : startMonth;
  const result: { month: string; date: string }[] = [];

  while (month <= currentMonth) {
    const date = dateFor(month, dayOfMonth);
    if (date > todayStr) break;
    result.push({ month, date });
    month = addMonth(month);
  }

  return result;
}
