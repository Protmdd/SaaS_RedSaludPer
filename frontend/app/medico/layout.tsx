"use client";

import * as React from "react";
import { LayoutDashboard, CalendarDays, Clock } from "lucide-react";
import { DashboardShell, PantallaCargando, type NavItem } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/lib/role-guard";

const NAV_ITEMS: NavItem[] = [
  { href: "/medico", label: "Panel", icon: LayoutDashboard },
  { href: "/medico/agenda", label: "Mi agenda", icon: CalendarDays },
  { href: "/medico/horarios", label: "Disponibilidad", icon: Clock },
];

export default function MedicoLayout({ children }: { children: React.ReactNode }) {
  const { listo } = useRoleGuard("medico");
  if (!listo) return <PantallaCargando texto="Cargando panel médico..." />;
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Panel médico">
      {children}
    </DashboardShell>
  );
}
