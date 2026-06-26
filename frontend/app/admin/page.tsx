"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Users, CalendarCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

interface KPI {
  total_medicos: number;
  total_citas: number;
  citas_hoy: number;
  tasa_ocupacion: number;
  tasa_ausentismo: number;
  citas_por_especialidad: Record<string, number>;
  citas_por_estado: Record<string, number>;
  tendencia_semanal: number[];
}

interface PerfilAdmin {
  nombres: string;
  apellidos: string;
  cargo: string;
  hospital_nombre: string;
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function AdminPanel() {
  const usuario = useAuth((s) => s.usuario);

  const { data: perfil } = useQuery<PerfilAdmin>({
    queryKey: ["admin-perfil"],
    queryFn: async () => (await api.get<PerfilAdmin>("/admin-hospital/perfil")).data,
  });

  const { data: kpi, isLoading } = useQuery<KPI>({
    queryKey: ["admin-kpis"],
    queryFn: async () => (await api.get<KPI>("/admin-hospital/kpis")).data,
  });

  const tendencia = (kpi?.tendencia_semanal ?? []).map((v, i) => {
    // Alinea los últimos 7 días terminando hoy con etiquetas de día de semana.
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { dia: DIAS_CORTOS[d.getDay() === 0 ? 6 : d.getDay() - 1], citas: v };
  });

  const porEspecialidad = Object.entries(kpi?.citas_por_especialidad ?? {}).map(([k, v]) => ({
    especialidad: k.length > 14 ? k.slice(0, 13) + "…" : k,
    citas: v,
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Administración</p>
        <h1 className="text-3xl font-semibold mt-1">{perfil?.hospital_nombre ?? "Establecimiento"}</h1>
        {perfil && (
          <p className="text-muted-foreground mt-1">
            {perfil.nombres} {perfil.apellidos} · {perfil.cargo}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Médicos activos"
          value={isLoading ? "—" : String(kpi?.total_medicos ?? 0)}
        />
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          label="Citas hoy"
          value={isLoading ? "—" : String(kpi?.citas_hoy ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ocupación"
          value={isLoading ? "—" : `${kpi?.tasa_ocupacion ?? 0}%`}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Ausentismo"
          value={isLoading ? "—" : `${kpi?.tasa_ausentismo ?? 0}%`}
          alerta={Boolean(kpi && kpi.tasa_ausentismo > 20)}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tendencia de citas (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendencia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="citas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Citas por especialidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {porEspecialidad.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  Sin datos suficientes.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porEspecialidad} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="especialidad" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="citas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  alerta = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div
          className={`w-11 h-11 rounded-lg grid place-items-center mb-3 ${
            alerta ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
