import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { brl, monthLabel, shiftMonth, today, typeColor } from "../lib/format";

type DashboardData = {
  month: string;
  summary: { income: number; expense: number; balance: number };
  totalBalance: number;
  byCategory: { categoryId: string; name: string; total: number; percent: number }[];
  evolution: { month: string; income: number; expense: number; balance: number }[];
};

const palette = ["#ef4444", "#f97316", "#f59e0b", "#ec4899", "#a855f7", "#3b82f6", "#14b8a6", "#64748b"];

function shortMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "");
}

const tooltipProps = {
  contentStyle: { backgroundColor: "#1e293b", border: "none", borderRadius: 8 },
  itemStyle: { color: "#e2e8f0" },
  labelStyle: { color: "#94a3b8" },
};

function Card({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>
        {brl(value)}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const requestId = useRef(0);

const load = useCallback(async () => {
  const id = ++requestId.current;
  try {
    const result = await api<DashboardData>(`/dashboard?month=${month}`);
    if (id !== requestId.current) return;
    setData(result);
    setError("");
  } catch (err) {
    if (id !== requestId.current) return;
    setError((err as Error).message);
  } finally {
    if (id === requestId.current) setLoading(false);
  }
}, [month]);

function changeMonth(delta: number) {
  setLoading(true);
  setMonth(shiftMonth(month, delta));
}

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-lg bg-slate-700 px-3 py-2 hover:bg-slate-600"
          >
            ‹
          </button>
          <span className="block w-44 text-center first-letter:uppercase">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-lg bg-slate-700 px-3 py-2 hover:bg-slate-600"
          >
            ›
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {loading || !data ? (
        <div className="animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-800" />
                ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
                <div className="h-80 rounded-xl bg-slate-800" />
                <div className="h-80 rounded-xl bg-slate-800" />
            </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card label="Saldo total" value={data.totalBalance} />
            <Card label="Receitas do mês" value={data.summary.income} color={typeColor("INCOME")} />
            <Card label="Despesas do mês" value={data.summary.expense} color={typeColor("EXPENSE")} />
            <Card
              label="Resultado do mês"
              value={data.summary.balance}
              color={data.summary.balance >= 0 ? typeColor("INCOME") : typeColor("EXPENSE")}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-xl bg-slate-800 p-4">
              <h3 className="font-semibold mb-3">Despesas por categoria</h3>

              {data.byCategory.length === 0 ? (
                <p className="text-sm text-slate-400">Sem despesas neste mês.</p>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.byCategory}
                          dataKey="total"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          stroke="none"
                        >
                          {data.byCategory.map((c, i) => (
                            <Cell key={c.categoryId} fill={palette[i % palette.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipProps} formatter={(v) => brl(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <ul className="mt-3 space-y-1 text-sm">
                    {data.byCategory.map((c, i) => (
                      <li key={c.categoryId} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: palette[i % palette.length] }}
                          />
                          {c.name}
                        </span>
                        <span className="text-slate-300">
                          {brl(c.total)} · {c.percent.toLocaleString("pt-BR")}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="rounded-xl bg-slate-800 p-4">
              <h3 className="font-semibold mb-3">Últimos 6 meses</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.evolution.map((e) => ({ ...e, label: shortMonth(e.month) }))}>
                    <CartesianGrid stroke="#334155" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      {...tooltipProps}
                      cursor={{ fill: "#334155" }}
                      formatter={(v) => brl(Number(v))}
                    />
                    <Bar dataKey="income" name="Receitas" fill={typeColor("INCOME")} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill={typeColor("EXPENSE")} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}