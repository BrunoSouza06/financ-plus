import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { brl, fmtDate, inputClass, monthLabel, shiftMonth, today, typeColor } from "../lib/format";

type TxType = "INCOME" | "EXPENSE";

type Account = { id: string; name: string };

type Category = {
  id: string;
  name: string;
  type: TxType;
  color: string | null;
};

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: TxType;
  date: string;
  accountId: string;
  categoryId: string;
  account: { id: string; name: string };
  category: { id: string; name: string; color: string | null };
};

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

const toIso = (br: string) => br.split("/").reverse().join("-");

export default function Transactions() {
  // Controle para ignorar respostas de requisições antigas
  const requestId = useRef(0);

  const [month, setMonth] = useState(today().slice(0, 7));
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");
  const [date, setDate] = useState(fmtDate(today()));
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const load = useCallback(async () => {
    const id = ++requestId.current;

    try {
      const { from, to } = monthBounds(month);
      const [acc, cat, list] = await Promise.all([
        api<Account[]>("/accounts"),
        api<Category[]>("/categories"),
        api<{ items: Transaction[] }>(`/transactions?from=${from}&to=${to}&limit=100`),
      ]);

      if (id !== requestId.current) return;

      setAccounts(acc);
      setCategories(cat);
      setItems(list.items);
    } catch (err) {
      if (id !== requestId.current) return;
      setError((err as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function changeMonth(delta: number) {
    setLoading(true);
    setMonth(shiftMonth(month, delta));
  }

  // Valores efetivos: se nada foi escolhido, usa a primeira opção válida
  const categoryOptions = categories.filter((c) => c.type === type);
  const selectedAccount = accountId || accounts[0]?.id || "";
  const selectedCategory = categoryOptions.some((c) => c.id === categoryId)
    ? categoryId
    : categoryOptions[0]?.id ?? "";

  const income = items
    .filter((i) => i.type === "INCOME")
    .reduce((s, i) => s + i.amount, 0);
  const expense = items
    .filter((i) => i.type === "EXPENSE")
    .reduce((s, i) => s + i.amount, 0);

  const missingBase = !loading && (accounts.length === 0 || categoryOptions.length === 0);

  function resetForm() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setType("EXPENSE");
    setDate(fmtDate(today()));
    setAccountId("");
    setCategoryId("");
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setDescription(t.description);
    setAmount(String(t.amount));
    setType(t.type);
    setDate(fmtDate(t.date));
    setAccountId(t.accountId);
    setCategoryId(t.categoryId);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      setError("Data inválida. Use o formato DD/MM/AAAA");
      return;
    }

    const payload = {
      description,
      amount: Number(amount),
      type,
      date: toIso(date),
      accountId: selectedAccount,
      categoryId: selectedCategory,
    };

    try {
      if (editingId) await api(`/transactions/${editingId}`, "PUT", payload);
      else await api("/transactions", "POST", payload);

      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    setError("");

    try {
      await api(`/transactions/${id}`, "DELETE");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Transações</h2>

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

      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <input
          className={`${inputClass} col-span-2 md:col-span-3`}
          placeholder="Descrição"
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
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          value={date}
          onChange={(e) => setDate(maskDate(e.target.value))}
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

      {missingBase && (
        <p className="text-sm text-amber-400 mb-3">
          Cadastre ao menos uma conta e uma categoria do tipo escolhido para lançar transações.
        </p>
      )}
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className={`flex gap-6 mb-4 text-sm ${loading ? "opacity-40" : ""}`}>
        <span className="text-emerald-400">Receitas: {brl(income)}</span>
        <span className="text-red-400">Despesas: {brl(expense)}</span>
        <span className="text-slate-300">Resultado: {brl(income - expense)}</span>
      </div>

      {loading ? (
        <ul className="space-y-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-16 rounded-xl bg-slate-800" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-slate-400">Nenhuma transação neste mês.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 w-20">{fmtDate(t.date)}</span>
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: typeColor(t.type) }}
                    />
                    {t.category.name} · {t.account.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`font-semibold ${
                    t.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"} {brl(t.amount)}
                </span>
                <button
                  onClick={() => startEdit(t)}
                  className="text-sm text-slate-300 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-sm text-red-400 hover:text-red-300"
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