import { create } from "zustand";
import { clearSession, getStoredUsuario, saveSession } from "@/lib/api";

/** Roles soportados por el cliente. */
export type Rol = "paciente" | "medico" | "admin_hospital";

/**
 * Identidad del usuario autenticado en el cliente.
 * Refleja el contrato `UsuarioPublico` del backend, común a todos los roles.
 */
export interface Usuario {
  id: string;
  rol: Rol;
  nombres: string;
  apellidos: string;
  email: string;
  ruta_inicio: string;
}

interface AuthState {
  usuario: Usuario | null;
  hydrated: boolean;
  setSession: (usuario: Usuario, accessToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  usuario: null,
  hydrated: false,
  setSession: (usuario, accessToken) => {
    saveSession(accessToken, usuario);
    // Al fijar la sesión marcamos hydrated en true para evitar que un guard
    // que corre inmediatamente después interprete la ausencia de usuario como
    // sesión inexistente (causa del rebote al iniciar sesión).
    set({ usuario, hydrated: true });
  },
  logout: () => {
    clearSession();
    set({ usuario: null });
  },
  hydrate: () => {
    const stored = getStoredUsuario<Usuario>();
    set({ usuario: stored, hydrated: true });
  },
}));

/** Helper para componer el nombre completo del usuario. */
export function nombreCompleto(u: Usuario): string {
  return `${u.nombres} ${u.apellidos}`;
}
