import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useConfirm } from "../components/ConfirmDialog";
import { brl, inputClass, today, typeColor } from "../lib/format";

type TxType = "INCOME" | "EXPENSE";
type Account = { id: string; name: string };
type Category = { id: string; name: string; type: TxType };
type Recurring = {
  id: string;
  description: string;
  amount: number;
  type: TxType;
  dayOfMonth: number;
  accountId: string;
  categoryId: string;
  startMonth: string;
  active: boolean;
  account: { id: string; name: string };
  category: { id: string; name: string };
};

const maskMonth = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const toBrMonth = (iso: string) => iso.split("-").reverse().join("/");
const toIsoMonth = (br: string) => br.split("/").reverse().join("-");

export default function RecurringPage() {
  const askConfirm = useConfirm();

  const [items, setItems] = useState<Recurring[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");
  const [day, setDay] = useState("1");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startMonth, setStartMonth] = useState(toBrMonth(today().slice(0, 7)));

  const load = useCallback(async () => {
    try {
      const [rec, acc, cat] = await Promise.all([
        api<Recurring[]>("/recurring"),
        api<Account[]>("/accounts"),
        api<Category[]>("/categories"),
      ]);
      setItems(rec);
      setAccounts(acc);
      setCategories(cat);
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

  const categoryOptions = categories.filter((c) => c.type === type);
  const selectedAccount = accountId || accounts[0]?.id || "";
  const selectedCategory = categoryOptions.some((c) => c.id === categoryId)
    ? categoryId
    : (categoryOptions[0]?.id ?? "");

  function resetForm() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setType("EXPENSE");
    setDay("1");
    setAccountId("");
    setCategoryId("");
    setStartMonth(toBrMonth(today().slice(0, 7)));
  }

  function startEdit(r: Recurring) {
    setEditingId(r.id);
    setDescription(r.description);
    setAmount(String(r.amount));
    setType(r.type);
    setDay(String(r.dayOfMonth));
    setAccountId(r.accountId);
    setCategoryId(r.categoryId);
    setStartMonth(toBrMonth(r.startMonth));
  }

  const toPayload = (r: Recurring, active: boolean) => ({
    description: r.description,
    amount: r.amount,
    type: r.type,
    dayOfMonth: r.dayOfMonth,
    accountId: r.accountId,
    categoryId: r.categoryId,
    startMonth: r.startMonth,
    active,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(startMonth)) {
      setError("Mês inicial inválido. Use o formato MM/AAAA");
      return;
    }

    const payload = {
      description,
      amount: Number(amount),
      type,
      dayOfMonth: Number(day),
      accountId: selectedAccount,
      categoryId: selectedCategory,
      startMonth: toIsoMonth(startMonth),
      active: items.find((i) => i.id === editingId)?.active ?? true,
    };

    try {
      if (editingId) await api(`/recurring/${editingId}`, "PUT", payload);
      else await api("/recurring", "POST", payload);
      await api("/recurring/run", "POST");
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleActive(r: Recurring) {
    setError("");
    try {
      await api(`/recurring/${r.id}`, "PUT", toPayload(r, !r.active));
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(r: Recurring) {
    const ok = await askConfirm({
      title: "Excluir recorrência",
      message: `Excluir "${r.description}"? Os lançamentos já gerados continuam nas transações.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;

    setError("");
    try {
      await api(`/recurring/${r.id}`, "DELETE");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Recorrentes</h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4"
      >
        <input
          className={`${inputClass} col-span-2 md:col-span-3`}
          placeholder="Descrição (ex: Aluguel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="number"
          min="1"
          max="31"
          placeholder="Dia"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          required
        />
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as TxType)}
        >
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
        <select
          className={`${inputClass} md:col-span-2`}
          value={selectedAccount}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} md:col-span-2`}
          value={selectedCategory}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder="Início MM/AAAA"
          maxLength={7}
          value={startMonth}
          onChange={(e) => setStartMonth(maskMonth(e.target.value))}
          required
        />
        <button
          type="submit"
          disabled={!selectedAccount || !selectedCategory}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
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
      ) : items.length === 0 ? (
        <p className="text-slate-400">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 p-3 ${
                r.active ? "" : "opacity-60"
              }`}
            >
              <div>
                <p className="font-medium flex items-center gap-2">
                  {r.description}
                  {!r.active && (
                    <span className="rounded-full bg-slate-600 px-2 py-0.5 text-xs">
                      Pausada
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  Todo dia {r.dayOfMonth} · {r.category.name} · {r.account.name}{" "}
                  · desde {toBrMonth(r.startMonth)}
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span
                  className="font-semibold"
                  style={{ color: typeColor(r.type) }}
                >
                  {r.type === "INCOME" ? "+" : "-"} {brl(r.amount)}
                </span>
                <button
                  onClick={() => toggleActive(r)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  {r.active ? "Pausar" : "Ativar"}
                </button>
                <button
                  onClick={() => startEdit(r)}
                  className="text-slate-300 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  className="text-red-400 hover:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
