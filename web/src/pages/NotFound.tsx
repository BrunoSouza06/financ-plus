import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
      <h1 className="text-5xl font-bold text-emerald-400">404</h1>
      <p className="text-slate-400">Página não encontrada</p>
      <Link to="/" className="text-emerald-400 hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}