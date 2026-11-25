import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { inputClass, typeColor } from "../lib/format";
import { useConfirm } from "../components/ConfirmDialog";

type TxType = "INCOME" | "EXPENSE";
type Category = {
  id: string;
  name: string;
  type: TxType;
  color: string | null;
};

const typeLabels: Record<TxType, string> = {
  EXPENSE: "Despesas",
  INCOME: "Receitas",
};

export default function Categories() {
  const askConfirm = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");

  const load = useCallback(async () => {
    try {
      setCategories(await api<Category[]>("/categories"));
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
    setType("EXPENSE");
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setName(c.name);
    setType(c.type);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { name, type };

    try {
      if (editingId) await api(`/categories/${editingId}`, "PUT", payload);
      else await api("/categories", "POST", payload);
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    const ok = await askConfirm({
      title: "Excluir categoria",
      message: "Tem certeza que deseja excluir esta categoria?",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setError("");

    try {
      await api(`/categories/${id}`, "DELETE");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Categorias</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input
          className={`${inputClass} flex-1 min-w-40`}
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
      ) : (
        (["EXPENSE", "INCOME"] as TxType[]).map((t) => (
          <div key={t} className="mb-6">
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: typeColor(t) }}
            >
              {typeLabels[t]}
            </h3>
            <ul className="space-y-2">
              {categories
                .filter((c) => c.type === t)
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-slate-800 p-3"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: typeColor(c.type) }}
                      />
                      {c.name}
                    </span>
                    <span className="flex gap-4">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Excluir
                      </button>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
