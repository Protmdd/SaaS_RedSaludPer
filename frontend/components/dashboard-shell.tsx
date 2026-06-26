"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Stethoscope, Menu, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, nombreCompleto } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Cascarón de panel compartido por las áreas de paciente, médico y
 * administrador. Centraliza la barra lateral fija de escritorio, el drawer
 * móvil, la identidad del usuario y el botón de cierre de sesión, recibiendo
 * los ítems de navegación y una etiqueta de rol propios de cada área.
 */
export function DashboardShell({
  navItems,
  roleLabel,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!usuario) return null;

  const sidebar = (
    <>
      <div className="hidden md:flex items-center gap-2 p-5 border-b">
        <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-lg leading-none block">RedSalud</span>
          <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const activo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activo
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-3">
        <div className="px-2">
          <p className="text-sm font-medium leading-tight">{nombreCompleto(usuario)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{usuario.email}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-card shrink-0">{sidebar}</aside>

      <header className="md:hidden border-b bg-card flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <span className="font-semibold">RedSalud</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <Menu className="w-5 h-5" />
        </Button>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-card border-r flex flex-col">
            <div className="flex items-center justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Cerrar">
                <X className="w-5 h-5" />
              </Button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="container max-w-5xl py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}

/** Cargando a pantalla completa mientras se resuelve el guard de rol. */
export function PantallaCargando({ texto = "Cargando..." }: { texto?: string }) {
  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">{texto}</div>
  );
}
