"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users, Clock, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

interface CitaAgenda {
  id: string;
  numero_cita: string;
  fecha: string;
  hora: string;
  estado: string;
  paciente_nombre: string;
  paciente_dni: string;
  especialidad: string;
  consultorio: string | null;
  motivo: string | null;
}

interface Resumen {
  citas_hoy: number;
  citas_semana: number;
  proxima_cita: CitaAgenda | null;
  pacientes_atendidos_mes: number;
}

interface PerfilMedico {
  nombres: string;
  apellidos: string;
  especialidad: string;
  hospital_nombre: string;
  colegiatura: string;
}

export default function MedicoPanel() {
  const usuario = useAuth((s) => s.usuario);

  const { data: perfil } = useQuery<PerfilMedico>({
    queryKey: ["medico-perfil"],
    queryFn: async () => (await api.get<PerfilMedico>("/medico/perfil")).data,
  });

  const { data: resumen, isLoading } = useQuery<Resumen>({
    queryKey: ["medico-resumen"],
    queryFn: async () => (await api.get<Resumen>("/medico/resumen")).data,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Bienvenido</p>
        <h1 className="text-3xl font-semibold mt-1">{usuario?.nombres} {usuario?.apellidos}</h1>
        {perfil && (
          <p className="text-muted-foreground mt-1">
            {perfil.especialidad} · {perfil.hospital_nombre} · {perfil.colegiatura}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Citas hoy"
          value={isLoading ? "—" : String(resumen?.citas_hoy ?? 0)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Esta semana"
          value={isLoading ? "—" : String(resumen?.citas_semana ?? 0)}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Atendidos este mes"
          value={isLoading ? "—" : String(resumen?.pacientes_atendidos_mes ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próxima cita</CardTitle>
        </CardHeader>
        <CardContent>
          {resumen?.proxima_cita ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{resumen.proxima_cita.paciente_nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFecha(resumen.proxima_cita.fecha)} · {resumen.proxima_cita.hora.slice(0, 5)} ·
                  Consultorio {resumen.proxima_cita.consultorio ?? "—"}
                </p>
                {resumen.proxima_cita.motivo && (
                  <p className="text-sm text-muted-foreground">Motivo: {resumen.proxima_cita.motivo}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes citas próximas programadas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
