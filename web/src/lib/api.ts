import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL;

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.error ?? json?.errors?.[0]?.message ?? "Erro na requisição");
  }

  return json as T;
}