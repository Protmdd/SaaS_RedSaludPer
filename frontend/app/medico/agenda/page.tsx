"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Check, X, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { api, getErrorMessage } from "@/lib/api";

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

const ESTADO_COLOR: Record<string, string> = {
  Confirmada: "bg-primary/10 text-primary",
  Completada: "bg-emerald-100 text-emerald-700",
  "No asistió": "bg-red-100 text-red-700",
  Cancelada: "bg-muted text-muted-foreground",
  Pendiente: "bg-amber-100 text-amber-700",
};

export default function AgendaMedico() {
  const qc = useQueryClient();
  const [soloFuturas, setSoloFuturas] = React.useState(false);

  const { data: citas = [], isLoading } = useQuery<CitaAgenda[]>({
    queryKey: ["medico-agenda", soloFuturas],
    queryFn: async () =>
      (await api.get<CitaAgenda[]>(`/medico/agenda?solo_futuras=${soloFuturas}`)).data,
  });

  const marcar = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) =>
      (await api.patch(`/medico/citas/${id}/estado?estado=${encodeURIComponent(estado)}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medico-agenda"] });
      qc.invalidateQueries({ queryKey: ["medico-resumen"] });
      toast({ title: "Cita actualizada", variant: "success" });
    },
    onError: (e) => toast({ title: "Error", description: getErrorMessage(e), variant: "error" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mi agenda</h1>
          <p className="text-muted-foreground mt-1">Citas programadas y registro de atención.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={soloFuturas ? "outline" : "default"}
            size="sm"
            onClick={() => setSoloFuturas(false)}
          >
            Todas
          </Button>
          <Button
            variant={soloFuturas ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloFuturas(true)}
          >
            Próximas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando agenda...</p>
      ) : citas.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay citas para mostrar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {citas.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-32 shrink-0">
                  <p className="font-semibold">{c.hora.slice(0, 5)}</p>
                  <p className="text-xs text-muted-foreground">{formatFecha(c.fecha)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{c.paciente_nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    DNI {c.paciente_dni} · Consultorio {c.consultorio ?? "—"}
                    {c.motivo ? ` · ${c.motivo}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    ESTADO_COLOR[c.estado] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.estado}
                </span>
                {c.estado === "Confirmada" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcar.mutate({ id: c.id, estado: "Completada" })}
                      disabled={marcar.isPending}
                    >
                      <Check className="w-4 h-4" />
                      Atendida
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcar.mutate({ id: c.id, estado: "No asistió" })}
                      disabled={marcar.isPending}
                    >
                      <X className="w-4 h-4" />
                      No asistió
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  });
}
