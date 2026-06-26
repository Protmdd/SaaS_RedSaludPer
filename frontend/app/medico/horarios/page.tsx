"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { api, getErrorMessage } from "@/lib/api";

interface Franja {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function HorariosMedico() {
  const qc = useQueryClient();
  const [dia, setDia] = React.useState(0);
  const [inicio, setInicio] = React.useState("08:00");
  const [fin, setFin] = React.useState("13:00");

  const { data: franjas = [], isLoading } = useQuery<Franja[]>({
    queryKey: ["medico-horarios"],
    queryFn: async () => (await api.get<Franja[]>("/medico/horarios")).data,
  });

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post("/medico/horarios", {
          dia_semana: dia,
          hora_inicio: `${inicio}:00`,
          hora_fin: `${fin}:00`,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medico-horarios"] });
      toast({ title: "Franja agregada", variant: "success" });
    },
    onError: (e) => toast({ title: "No se pudo agregar", description: getErrorMessage(e), variant: "error" }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/medico/horarios/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medico-horarios"] });
      toast({ title: "Franja eliminada", variant: "success" });
    },
    onError: (e) => toast({ title: "Error", description: getErrorMessage(e), variant: "error" }),
  });

  const porDia = DIAS.map((nombre, idx) => ({
    nombre,
    idx,
    franjas: franjas.filter((f) => f.dia_semana === idx).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Disponibilidad</h1>
        <p className="text-muted-foreground mt-1">
          Define las franjas horarias en que atiendes. Estas guían la generación de cupos.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="dia">Día</Label>
              <select
                id="dia"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={dia}
                onChange={(e) => setDia(Number(e.target.value))}
              >
                {DIAS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicio">Desde</Label>
              <input
                id="inicio"
                type="time"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin">Hasta</Label>
              <input
                id="fin"
                type="time"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </div>
            <Button onClick={() => crear.mutate()} disabled={crear.isPending}>
              <Plus className="w-4 h-4" />
              Agregar franja
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando horarios...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {porDia.map((d) => (
            <Card key={d.idx}>
              <CardContent className="p-4">
                <p className="font-semibold mb-3">{d.nombre}</p>
                {d.franjas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin franjas.</p>
                ) : (
                  <div className="space-y-2">
                    {d.franjas.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between bg-secondary rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {f.hora_inicio.slice(0, 5)} – {f.hora_fin.slice(0, 5)}
                        </div>
                        <button
                          onClick={() => eliminar.mutate(f.id)}
                          className="text-muted-foreground hover:text-red-600 transition-colors"
                          aria-label="Eliminar franja"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
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
