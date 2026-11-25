import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useConfirm } from "../components/ConfirmDialog";
import { brl, fmtDate, inputClass, maskDate, toIso } from "../lib/format";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
};

type MoneyDialog = { goal: Goal; mode: "add" | "remove" };

const pct = (g: Goal) => Math.min(100, (g.savedAmount / g.targetAmount) * 100);

export default function Goals() {
  const askConfirm = useConfirm();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [deadline, setDeadline] = useState("");

  const [moneyDialog, setMoneyDialog] = useState<MoneyDialog | null>(null);
  const [moneyValue, setMoneyValue] = useState("");
  const [moneyError, setMoneyError] = useState("");

  const load = useCallback(async () => {
    try {
      setGoals(await api<Goal[]>("/goals"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTarget("");
    setSaved("0");
    setDeadline("");
  }

  function startEdit(g: Goal) {
    setEditingId(g.id);
    setName(g.name);
    setTarget(String(g.targetAmount));
    setSaved(String(g.savedAmount));
    setDeadline(g.deadline ? fmtDate(g.deadline) : "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (deadline && !/^\d{2}\/\d{2}\/\d{4}$/.test(deadline)) {
      setError("Prazo inválido. Use o formato DD/MM/AAAA");
      return;
    }

    const payload = {
      name,
      targetAmount: Number(target),
      savedAmount: Number(saved),
      deadline: deadline ? toIso(deadline) : null,
    };

    try {
      if (editingId) await api(`/goals/${editingId}`, "PUT", payload);
      else await api("/goals", "POST", payload);
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openMoney(goal: Goal, mode: "add" | "remove") {
    setMoneyDialog({ goal, mode });
    setMoneyValue("");
    setMoneyError("");
  }

  function closeMoney() {
    setMoneyDialog(null);
  }

  async function submitMoney(e: FormEvent) {
    e.preventDefault();
    if (!moneyDialog) return;

    const { goal, mode } = moneyDialog;
    const value = Number(moneyValue);

    if (!(value > 0)) {
      setMoneyError("Informe um valor maior que zero");
      return;
    }
    if (mode === "remove" && value > goal.savedAmount) {
      setMoneyError(`Você só tem ${brl(goal.savedAmount)} guardado nesta meta`);
      return;
    }

    const newSaved =
      Math.round((goal.savedAmount + (mode === "add" ? value : -value)) * 100) /
      100;

    try {
      await api(`/goals/${goal.id}`, "PUT", {
        name: goal.name,
        targetAmount: goal.targetAmount,
        savedAmount: newSaved,
        deadline: goal.deadline ? goal.deadline.slice(0, 10) : null,
      });
      closeMoney();
      await load();
    } catch (err) {
      setMoneyError((err as Error).message);
    }
  }

  async function handleDelete(g: Goal) {
    const ok = await askConfirm({
      title: "Excluir meta",
      message: `Tem certeza que deseja excluir a meta "${g.name}"?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;

    setError("");
    try {
      await api(`/goals/${g.id}`, "DELETE");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Metas</h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4"
      >
        <input
          className={`${inputClass} col-span-2 md:col-span-2`}
          placeholder="Nome da meta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Valor da meta"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0"
          placeholder="Já guardado"
          value={saved}
          onChange={(e) => setSaved(e.target.value)}
        />
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder="Prazo DD/MM/AAAA"
          maxLength={10}
          value={deadline}
          onChange={(e) => setDeadline(maskDate(e.target.value))}
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900 hover:bg-emerald-400"
        >
          {editingId ? "Salvar" : "Adicionar"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
          >
            Cancelar
          </button>
        )}
      </form>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : goals.length === 0 ? (
        <p className="text-slate-400">Nenhuma meta cadastrada.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const done = pct(g) >= 100;

            return (
              <li
                key={g.id}
                className={`relative overflow-hidden rounded-xl border p-4 ${
                  done
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-transparent bg-slate-800"
                }`}
              >
                {done && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent">
                    <svg
                      className="absolute -right-3 -top-3 h-32 w-32 text-emerald-400/20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="relative">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="flex items-center gap-2 font-semibold">
                      {g.name}
                      {done && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-slate-900">
                          ✓ Meta atingida
                        </span>
                      )}
                    </p>
                    <span className="text-sm text-slate-400">
                      {g.deadline
                        ? `Prazo: ${fmtDate(g.deadline)}`
                        : "Sem prazo"}
                    </span>
                  </div>

                  <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full bg-emerald-500 ${
                        done ? "shadow-[0_0_12px_rgba(16,185,129,0.8)]" : ""
                      }`}
                      style={{ width: `${pct(g)}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-sm">
                    <span>
                      {brl(g.savedAmount)} de {brl(g.targetAmount)} ·{" "}
                      {pct(g).toFixed(0)}%
                    </span>
                    <span className="flex gap-4">
                      <button
                        onClick={() => openMoney(g, "add")}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        + Guardar
                      </button>
                      <button
                        onClick={() => openMoney(g, "remove")}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        − Retirar
                      </button>
                      <button
                        onClick={() => startEdit(g)}
                        className="text-slate-300 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Excluir
                      </button>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {moneyDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeMoney}
        >
          <form
            onSubmit={submitMoney}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-slate-800 p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-1">
              {moneyDialog.mode === "add"
                ? "Guardar dinheiro"
                : "Retirar dinheiro"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {moneyDialog.mode === "add"
                ? `Quanto você quer guardar em "${moneyDialog.goal.name}"?`
                : `Quanto você quer retirar de "${moneyDialog.goal.name}"? Guardado: ${brl(moneyDialog.goal.savedAmount)}`}
            </p>

            <input
              autoFocus
              className={`${inputClass} w-full`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Valor em R$"
              value={moneyValue}
              onChange={(e) => setMoneyValue(e.target.value)}
            />

            {moneyError && (
              <p className="text-sm text-red-400 mt-2">{moneyError}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeMoney}
                className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`rounded-lg px-4 py-2 font-semibold text-slate-900 ${
                  moneyDialog.mode === "add"
                    ? "bg-emerald-500 hover:bg-emerald-400"
                    : "bg-amber-400 hover:bg-amber-300"
                }`}
              >
                {moneyDialog.mode === "add" ? "Guardar" : "Retirar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
