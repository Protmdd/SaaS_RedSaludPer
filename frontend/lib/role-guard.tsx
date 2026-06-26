"use client";

import * as React from "react";
import { Calendar, CalendarPlus, CircleUserRound } from "lucide-react";
import { DashboardShell, PantallaCargando, type NavItem } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/lib/role-guard";

const NAV_ITEMS: NavItem[] = [
  { href: "/portal", label: "Inicio", icon: Calendar },
  { href: "/portal/reservar", label: "Reservar cita", icon: CalendarPlus },
  { href: "/portal/mis-citas", label: "Mis citas", icon: Calendar },
  { href: "/portal/perfil", label: "Mi perfil", icon: CircleUserRound },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { listo } = useRoleGuard("paciente");

  if (!listo) {
    return <PantallaCargando texto="Verificando acceso..." />;
  }

  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Portal del paciente">
      {children}
    </DashboardShell>
  );
}