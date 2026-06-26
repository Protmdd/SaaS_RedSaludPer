"use client";

import * as React from "react";
import { LayoutDashboard, Users, CalendarRange } from "lucide-react";
import { DashboardShell, PantallaCargando, type NavItem } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/lib/role-guard";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/medicos", label: "Médicos", icon: Users },
  { href: "/admin/citas", label: "Supervisión de citas", icon: CalendarRange },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { listo } = useRoleGuard("admin_hospital");
  if (!listo) return <PantallaCargando texto="Cargando administración..." />;
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Administración hospitalaria">
      {children}
    </DashboardShell>
  );
}
