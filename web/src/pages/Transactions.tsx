import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { api } from "../lib/api";
import {
  brl,
  fmtDate,
  inputClass,
  monthLabel,
  shiftMonth,
  today,
  typeColor,
  maskDate,
  toIso,
} from "../lib/format";
import { useConfirm } from "../components/ConfirmDialog";
import { downloadCsv, safeText } from "../lib/csv";

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
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

export default function Transactions() {
  const askConfirm = useConfirm();
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

  const [filterAccount, setFilterAccount] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const { from, to } = monthBounds(month);
      const params = new URLSearchParams({ from, to, limit: "100" });
      if (filterAccount) params.set("accountId", filterAccount);
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterType) params.set("type", filterType);

      const [acc, cat, list] = await Promise.all([
        api<Account[]>("/accounts"),
        api<Category[]>("/categories"),
        api<{ items: Transaction[] }>(`/transactions?${params}`),
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
  }, [month, filterAccount, filterType, filterCategory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function changeMonth(delta: number) {
    setLoading(true);
    setMonth(shiftMonth(month, delta));
  }

  function changeFilter(setter: (v: string) => void, value: string) {
    setLoading(true);
    setter(value);
  }

  function clearFilters() {
    setLoading(true);
    setFilterAccount("");
    setFilterType("");
    setFilterCategory("");
  }

  async function exportCsv() {
    setExporting(true);
    setError("");

    try {
      const { from, to } = monthBounds(month);
      const all: Transaction[] = [];

      for (let page = 1; ; page++) {
        const params = new URLSearchParams({
          from,
          to,
          limit: "100",
          page: String(page),
        });
        if (filterAccount) params.set("accountId", filterAccount);
        if (filterCategory) params.set("categoryId", filterCategory);
        if (filterType) params.set("type", filterType);

        const res = await api<{ items: Transaction[]; total: number }>(
          `/transactions?${params}`,
        );
        all.push(...res.items);
        if (res.items.length === 0 || all.length >= res.total) break;
      }

      downloadCsv(`transacoes-${month}.csv`, [
        ["Data", "Descrição", "Tipo", "Categoria", "Conta", "Valor"],
        ...all.map((t) => [
          fmtDate(t.date),
          safeText(t.description),
          t.type === "INCOME" ? "Receita" : "Despesa",
          safeText(t.category.name),
          safeText(t.account.name),
          (t.type === "INCOME" ? "" : "-") +
            t.amount.toFixed(2).replace(".", ","),
        ]),
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // Valores efetivos: se nada foi escolhido, usa a primeira opção válida
  const categoryOptions = categories.filter((c) => c.type === type);
  const selectedAccount = accountId || accounts[0]?.id || "";
  const selectedCategory = categoryOptions.some((c) => c.id === categoryId)
    ? categoryId
    : (categoryOptions[0]?.id ?? "");

  const income = items
    .filter((i) => i.type === "INCOME")
    .reduce((s, i) => s + i.amount, 0);
  const expense = items
    .filter((i) => i.type === "EXPENSE")
    .reduce((s, i) => s + i.amount, 0);

  const missingBase =
    !loading && (accounts.length === 0 || categoryOptions.length === 0);

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
    const ok = await askConfirm({
      title: "Excluir transação",
      message: "Tem certeza que deseja excluir esta transação?",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
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

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4"
      >
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
          Cadastre ao menos uma conta e uma categoria do tipo escolhido para
          lançar transações.
        </p>
      )}
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className={inputClass}
          value={filterAccount}
          onChange={(e) => changeFilter(setFilterAccount, e.target.value)}
        >
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={filterType}
          onChange={(e) => {
            setFilterCategory("");
            changeFilter(setFilterType, e.target.value);
          }}
        >
          <option value="">Receitas e despesas</option>
          <option value="EXPENSE">Despesas</option>
          <option value="INCOME">Receitas</option>
        </select>

        <select
          className={inputClass}
          value={filterCategory}
          onChange={(e) => changeFilter(setFilterCategory, e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories
            .filter((c) => !filterType || c.type === filterType)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        {(filterAccount || filterType || filterCategory) && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
          >
            Limpar filtros
          </button>
        )}

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="ml-auto rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600 disabled:opacity-50"
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      <div className={`flex gap-6 mb-4 text-sm ${loading ? "opacity-40" : ""}`}>
        <span className="text-emerald-400">Receitas: {brl(income)}</span>
        <span className="text-red-400">Despesas: {brl(expense)}</span>
        <span className="text-slate-300">
          Resultado: {brl(income - expense)}
        </span>
      </div>

      {loading ? (
        <ul className="space-y-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-16 rounded-xl bg-slate-800" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-slate-400">Nenhuma transação encontrada.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 w-20">
                  {fmtDate(t.date)}
                </span>
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
