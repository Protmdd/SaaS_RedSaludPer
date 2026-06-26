"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  MapPin,
  XCircle,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Cita {
  id: string;
  numero_cita: string;
  fecha: string;
  hora: string;
  estado: string;
  medico_nombre: string;
  especialidad: string;
  hospital_nombre: string;
  hospital_direccion: string | null;
  consultorio: string | null;
  motivo: string | null;
}

type Filtro = "proximas" | "pasadas" | "todas";

const ESTADOS_ACTIVOS = ["Confirmada", "Pendiente", "Reprogramada"];

/**
 * Listado de citas del paciente con filtros por estado temporal.
 *
 * Separa próximas vs. pasadas para que el paciente vea inmediatamente lo que
 * más le importa (su siguiente cita). La cancelación se hace desde la misma
 * tarjeta con confirmación verbal mediante el toast.
 */
export default function MisCitasPage() {
  const [filtro, setFiltro] = React.useState<Filtro>("proximas");
  const qc = useQueryClient();

  const { data: citas = [], isLoading } = useQuery<Cita[]>({
    queryKey: ["mis-citas"],
    queryFn: async () => (await api.get<Cita[]>("/citas/")).data,
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/citas/${id}`)).data,
    onSuccess: () => {
      toast({ title: "Cita cancelada", variant: "success" });
      qc.invalidateQueries({ queryKey: ["mis-citas"] });
    },
    onError: (err) =>
      toast({ title: "No se pudo cancelar", description: getErrorMessage(err), variant: "error" }),
  });

  const filtradas = React.useMemo(() => {
    if (filtro === "todas") return citas;
    if (filtro === "proximas") return citas.filter((c) => ESTADOS_ACTIVOS.includes(c.estado));
    return citas.filter((c) => !ESTADOS_ACTIVOS.includes(c.estado));
  }, [citas, filtro]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis citas</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus citas médicas activas e historial.</p>
        </div>
        <Button asChild>
          <Link href="/portal/reservar">
            <CalendarPlus className="w-4 h-4" /> Reservar nueva
          </Link>
        </Button>
      </div>

      {/* Tabs de filtro */}
      <div className="inline-flex rounded-lg border bg-card p-1">
        {(["proximas", "pasadas", "todas"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
              filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "proximas" ? "Próximas" : f === "pasadas" ? "Pasadas" : "Todas"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tus citas...</p>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-secondary mx-auto grid place-items-center">
              <Calendar className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No hay citas en esta vista</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {filtro === "proximas"
                ? "No tienes citas programadas. Reserva una para verla aquí."
                : "Aún no tienes historial de citas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((cita) => (
            <CitaDetalle
              key={cita.id}
              cita={cita}
              cancelable={ESTADOS_ACTIVOS.includes(cita.estado)}
              onCancelar={() => cancelar.mutate(cita.id)}
              cancelando={cancelar.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CitaDetalle({
  cita,
  cancelable,
  onCancelar,
  cancelando,
}: {
  cita: Cita;
  cancelable: boolean;
  onCancelar: () => void;
  cancelando: boolean;
}) {
  const fecha = new Date(`${cita.fecha}T${cita.hora}`);
  const fechaFmt = fecha.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const horaFmt = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  const badgeClass =
    cita.estado === "Cancelada" || cita.estado === "No asistió"
      ? "badge-danger"
      : cita.estado === "Completada"
      ? "badge-success"
      : "badge-info";

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">N° {cita.numero_cita}</p>
            <p className="text-lg font-semibold capitalize mt-0.5">{fechaFmt}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5" /> {horaFmt}
            </p>
          </div>
          <span className={badgeClass}>{cita.estado}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
          <DetalleLinea icon={<Stethoscope className="w-4 h-4" />} label="Especialidad" value={cita.especialidad} />
          <DetalleLinea icon={<Stethoscope className="w-4 h-4" />} label="Médico" value={cita.medico_nombre} />
          <DetalleLinea
            icon={<Building2 className="w-4 h-4" />}
            label="Establecimiento"
            value={cita.hospital_nombre}
          />
          {cita.hospital_direccion && (
            <DetalleLinea icon={<MapPin className="w-4 h-4" />} label="Dirección" value={cita.hospital_direccion} />
          )}
          {cita.consultorio && (
            <DetalleLinea icon={<MapPin className="w-4 h-4" />} label="Consultorio" value={cita.consultorio} />
          )}
        </div>

        {cita.motivo && (
          <div className="text-sm bg-secondary/50 rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1">Motivo</p>
            <p>{cita.motivo}</p>
          </div>
        )}

        {cancelable && (
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onCancelar} disabled={cancelando}>
              <XCircle className="w-4 h-4" />
              {cancelando ? "Cancelando..." : "Cancelar cita"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetalleLinea({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
