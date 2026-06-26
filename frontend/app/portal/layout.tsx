"use client";

import * as React from "react";
import { Calendar, CalendarPlus, CircleUserRound } from "lucide-react";
import { DashboardShell, PantallaCargando, type NavItem } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/lib/role-guard";

/**
 * Layout del portal del paciente.
 *
 * Protege el área con el guard de rol y delega la estructura visual al
 * cascarón de panel compartido. Mientras el guard resuelve la sesión, muestra
 * un estado de carga para evitar parpadeos o accesos indebidos.
 */
const NAV_ITEMS: NavItem[] = [
  { href: "/portal", label: "Inicio", icon: Calendar },
  { href: "/portal/reservar", label: "Reservar cita", icon: CalendarPlus },
  { href: "/portal/mis-citas", label: "Mis citas", icon: Calendar },
  { href: "/portal/perfil", label: "Mi perfil", icon: CircleUserRound },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { listo } = useRoleGuard("paciente");
  if (!listo) return <PantallaCargando texto="Cargando portal..." />;
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Portal del paciente">
      {children}
    </DashboardShell>
  );
}
