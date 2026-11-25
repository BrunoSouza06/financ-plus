import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Categories from "./pages/Categories";
import Transactions from "./pages/Transactions";
import NotFound from "./pages/NotFound";
import Goals from "./pages/Goals";
import { ConfirmProvider } from "./components/ConfirmDialog";
import Recurring from "./pages/Recurring";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/contas" element={<Accounts />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/transacoes" element={<Transactions />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/metas" element={<Goals />} />
                <Route path="/recorrentes" element={<Recurring />} />
              </Route>
            </Route>
          </Routes>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
