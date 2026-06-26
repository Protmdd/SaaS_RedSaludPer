import axios, { AxiosError, AxiosInstance } from "axios";

/**
 * Cliente HTTP de la aplicación.
 *
 * Apunta al backend FastAPI a través del rewrite configurado en next.config.js,
 * que mantiene la URL del API fuera del bundle del cliente. Incluye un
 * interceptor que adjunta el JWT del usuario si está disponible en localStorage
 * y otro que centraliza el manejo de errores comunes (401 desencadena logout).
 */

const STORAGE_TOKEN = "redsalud_token";
const STORAGE_USUARIO = "redsalud_usuario";

export const api: AxiosInstance = axios.create({
  baseURL: "/api/backend",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Adjunta automáticamente el token de acceso a las peticiones autenticadas
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(STORAGE_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Centraliza la respuesta a errores 401: limpia la sesión y redirige al login.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const enRutaPublica = ["/", "/ingresar", "/registro"].includes(window.location.pathname);
      if (!enRutaPublica) {
        clearSession();
        window.location.href = "/ingresar";
      }
    }
    return Promise.reject(error);
  },
);

/** Guarda el par token/usuario en almacenamiento del navegador. */
export function saveSession(token: string, usuario: unknown): void {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario));
}

/** Limpia la sesión persistida. */
export function clearSession(): void {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USUARIO);
}

/** Devuelve el usuario almacenado o null si no hay sesión. */
export function getStoredUsuario<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_USUARIO);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Indica si hay un token almacenado. */
export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(STORAGE_TOKEN));
}

/** Extrae un mensaje legible de un error de Axios. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    if (error.message) return error.message;
  }
  return "Ocurrió un error inesperado. Inténtelo nuevamente.";
}
