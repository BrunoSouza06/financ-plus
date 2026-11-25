import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/contas", label: "Contas" },
  { to: "/categorias", label: "Categorias" },
  { to: "/transacoes", label: "Transações" },
  { to: "/metas", label: "Metas" },
  { to: "/recorrentes", label: "Recorrentes" },
];

export default function Layout() {
  const { session } = useAuth();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    api("/recurring/run", "POST")
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-900 text-white">
      {/* Desktop: menu lateral */}
      <aside className="hidden md:flex w-56 bg-slate-800 p-4 flex-col">
        <h1 className="text-xl font-bold text-emerald-400 mb-6">FinanC+</h1>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 ${
                  isActive
                    ? "bg-emerald-500 text-slate-900 font-semibold"
                    : "hover:bg-slate-700"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <p className="text-xs text-slate-400 truncate mb-2">
          {session?.user.email}
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-lg bg-slate-700 px-3 py-2 hover:bg-slate-600"
        >
          Sair
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Celular: barra no topo só com o logo e o Sair */}
        <header className="md:hidden flex items-center justify-between bg-slate-800 px-4 py-3">
          <span className="font-bold text-emerald-400">FinanC+</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-300"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6">
          {ready ? <Outlet /> : <p className="text-slate-400">Carregando...</p>}
        </main>
      </div>

      {/* Celular: menu fixo embaixo */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-800 border-t border-slate-700 flex">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs ${
                isActive ? "text-emerald-400 font-semibold" : "text-slate-400"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
