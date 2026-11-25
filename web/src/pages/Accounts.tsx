import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useConfirm } from "../components/ConfirmDialog";

type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CASH"
  | "CREDIT_CARD"
  | "INVESTMENT";

type Account = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
};

const typeLabels: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  INVESTMENT: "Investimento",
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const inputClass =
  "rounded-lg bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500";

export default function Accounts() {
  const askConfirm = useConfirm();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [initialBalance, setInitialBalance] = useState("0");

  const load = useCallback(async () => {
    try {
      setAccounts(await api<Account[]>("/accounts"));
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
    setType("CHECKING");
    setInitialBalance("0");
  }

  function startEdit(a: Account) {
    setEditingId(a.id);
    setName(a.name);
    setType(a.type);
    setInitialBalance(String(a.initialBalance));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const payload = { name, type, initialBalance: Number(initialBalance) };

    try {
      if (editingId) await api(`/accounts/${editingId}`, "PUT", payload);
      else await api("/accounts", "POST", payload);
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    const ok = await askConfirm({
      title: "Excluir conta",
      message: "Tem certeza que deseja excluir esta conta?",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setError("");

    try {
      await api(`/accounts/${id}`, "DELETE");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Contas</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input
          className={`${inputClass} flex-1 min-w-40`}
          placeholder="Nome da conta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
        >
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          className={`${inputClass} w-36`}
          type="number"
          step="0.01"
          placeholder="Saldo inicial"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
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
      ) : accounts.length === 0 ? (
        <p className="text-slate-400">Nenhuma conta cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 p-4"
            >
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-slate-400">{typeLabels[a.type]}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-emerald-400">
                  {brl(a.balance)}
                </span>
                <button
                  onClick={() => startEdit(a)}
                  className="text-sm text-slate-300 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
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
