"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { CalendarRange, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface CitaSupervision {
  id: string;
  numero_cita: string;
  fecha: string;
  hora: string;
  estado: string;
  paciente_nombre: string;
  medico_nombre: string;
  especialidad: string;
}

const ESTADO_COLOR: Record<string, string> = {
  Confirmada: "bg-primary/10 text-primary",
  Completada: "bg-emerald-100 text-emerald-700",
  "No asistió": "bg-red-100 text-red-700",
  Cancelada: "bg-muted text-muted-foreground",
  Pendiente: "bg-amber-100 text-amber-700",
};

export default function CitasAdmin() {
  const [filtro, setFiltro] = React.useState("");

  const { data: citas = [], isLoading } = useQuery<CitaSupervision[]>({
    queryKey: ["admin-citas"],
    queryFn: async () => (await api.get<CitaSupervision[]>("/admin-hospital/citas")).data,
  });

  const filtradas = citas.filter((c) => {
    const q = filtro.toLowerCase();
    return (
      c.paciente_nombre.toLowerCase().includes(q) ||
      c.medico_nombre.toLowerCase().includes(q) ||
      c.especialidad.toLowerCase().includes(q) ||
      c.numero_cita.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Supervisión de citas</h1>
        <p className="text-muted-foreground mt-1">Todas las citas del establecimiento.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por paciente, médico, especialidad..."
          className="pl-9"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando citas...</p>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <CalendarRange className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay citas que coincidan.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left text-muted-foreground">
                  <th className="font-medium px-4 py-3">N° Cita</th>
                  <th className="font-medium px-4 py-3">Fecha</th>
                  <th className="font-medium px-4 py-3">Paciente</th>
                  <th className="font-medium px-4 py-3">Médico</th>
                  <th className="font-medium px-4 py-3">Especialidad</th>
                  <th className="font-medium px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtradas.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{c.numero_cita}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatFecha(c.fecha)} {c.hora.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3">{c.paciente_nombre}</td>
                    <td className="px-4 py-3">{c.medico_nombre}</td>
                    <td className="px-4 py-3">{c.especialidad}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          ESTADO_COLOR[c.estado] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
}
