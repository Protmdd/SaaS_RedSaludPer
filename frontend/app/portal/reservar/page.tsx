"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  Crosshair,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

interface Cupo {
  hospital_id: string;
  hospital_nombre: string;
  hospital_tipo: "MINSA" | "EsSalud";
  hospital_distrito: string;
  hospital_latitud: number | null;
  hospital_longitud: number | null;
  distancia_km: number | null;
  medico_id: string;
  medico_nombre: string;
  especialidad: string;
  fecha: string;
  hora: string;
  cupos_disponibles: number;
}

type Paso = "buscar" | "resultados" | "confirmar" | "exito";

/**
 * Búsqueda y reserva de cita.
 *
 * Flujo guiado en cuatro pasos: criterios, resultados, confirmación y éxito.
 * Mantener pasos discretos evita que el paciente se pierda en una pantalla
 * sobrecargada y permite mostrar progreso claro. La búsqueda es server-side
 * mediante una mutación; los resultados se exhiben con datos de ubicación y
 * tipo de institución para que el paciente decida con criterio.
 */
export default function ReservarPage() {
  const router = useRouter();
  const usuario = useAuth((s) => s.usuario);

  const [paso, setPaso] = React.useState<Paso>("buscar");
  const [criterios, setCriterios] = React.useState({
    especialidad: "",
    distrito: "",
    tipo_institucion: "",
    usarUbicacion: false,
    latitud: undefined as number | undefined,
    longitud: undefined as number | undefined,
  });
  const [cupos, setCupos] = React.useState<Cupo[]>([]);
  const [seleccion, setSeleccion] = React.useState<Cupo | null>(null);
  const [motivo, setMotivo] = React.useState("");
  const [citaCreada, setCitaCreada] = React.useState<{ numero_cita: string; consultorio: string } | null>(null);

  const { data: especialidades = [] } = useQuery<string[]>({
    queryKey: ["catalogo-especialidades"],
    queryFn: async () => (await api.get<string[]>("/catalogo/especialidades")).data,
    staleTime: 1000 * 60 * 10,
  });

  const buscar = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { especialidad: criterios.especialidad };
      if (criterios.distrito) payload.distrito = criterios.distrito;
      if (criterios.tipo_institucion) payload.tipo_institucion = criterios.tipo_institucion;
      if (criterios.usarUbicacion && criterios.latitud && criterios.longitud) {
        payload.latitud = criterios.latitud;
        payload.longitud = criterios.longitud;
        payload.radio_km = 25;
      }
      const { data } = await api.post<Cupo[]>("/disponibilidad/buscar", payload);
      return data;
    },
    onSuccess: (data) => {
      setCupos(data);
      setPaso("resultados");
      if (data.length === 0) {
        toast({
          title: "Sin disponibilidad",
          description: "No encontramos cupos con esos criterios. Prueba con otra especialidad o ubicación.",
          variant: "default",
        });
      }
    },
    onError: (err) =>
      toast({ title: "No se pudo buscar", description: getErrorMessage(err), variant: "error" }),
  });

  const reservar = useMutation({
    mutationFn: async () => {
      if (!seleccion) throw new Error("No hay selección");
      const { data } = await api.post("/citas/", {
        medico_id: seleccion.medico_id,
        hospital_id: seleccion.hospital_id,
        fecha: seleccion.fecha,
        hora: seleccion.hora,
        motivo: motivo || null,
      });
      return data as { id: string; numero_cita: string; consultorio: string };
    },
    onSuccess: (data) => {
      setCitaCreada(data);
      setPaso("exito");
    },
    onError: (err) =>
      toast({ title: "No se pudo reservar", description: getErrorMessage(err), variant: "error" }),
  });

  function pedirUbicacion() {
    if (!navigator.geolocation) {
      toast({ title: "Tu navegador no soporta geolocalización", variant: "error" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCriterios((c) => ({
          ...c,
          usarUbicacion: true,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
        }));
        toast({ title: "Ubicación detectada", description: "Buscaremos hospitales cerca de ti", variant: "success" });
      },
      () => toast({ title: "No pudimos obtener tu ubicación", variant: "error" }),
    );
  }

  // -------------------------------------------------------------------------
  // PASO: ÉXITO
  // -------------------------------------------------------------------------
  if (paso === "exito" && citaCreada) {
    const fechaFmt = new Date(`${seleccion!.fecha}T${seleccion!.hora}`).toLocaleString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 text-success grid place-items-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-semibold">¡Cita reservada!</h2>
            <p className="text-muted-foreground">
              Tu cita quedó confirmada. Recibirás un recordatorio por correo antes de la fecha.
            </p>
            <div className="surface-elevated p-5 text-left mt-6 space-y-3">
              <DetalleItem label="Número de cita" value={citaCreada.numero_cita} />
              <DetalleItem label="Fecha y hora" value={fechaFmt} className="capitalize" />
              <DetalleItem label="Especialidad" value={seleccion!.especialidad} />
              <DetalleItem label="Médico" value={seleccion!.medico_nombre} />
              <DetalleItem
                label="Establecimiento"
                value={`${seleccion!.hospital_nombre} (${seleccion!.hospital_tipo})`}
              />
              <DetalleItem label="Consultorio" value={citaCreada.consultorio} />
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => router.push("/portal/mis-citas")}>
                Ver mis citas
              </Button>
              <Button onClick={() => router.push("/portal")}>Volver al inicio</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PASO: CONFIRMAR
  // -------------------------------------------------------------------------
  if (paso === "confirmar" && seleccion) {
    const fechaFmt = new Date(`${seleccion.fecha}T${seleccion.hora}`).toLocaleString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setPaso("resultados")}>
          <ArrowLeft className="w-4 h-4" /> Volver a resultados
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">Confirmar tu cita</h1>
          <p className="text-muted-foreground mt-1">Revisa los datos antes de confirmar la reserva.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <DetalleItem label="Paciente" value={usuario ? `${usuario.nombres} ${usuario.apellidos}` : ""} />
            <DetalleItem label="Fecha y hora" value={fechaFmt} className="capitalize" />
            <DetalleItem label="Especialidad" value={seleccion.especialidad} />
            <DetalleItem label="Médico" value={seleccion.medico_nombre} />
            <DetalleItem
              label="Establecimiento"
              value={`${seleccion.hospital_nombre} · ${seleccion.hospital_distrito}`}
            />
            <div className="pt-2">
              <Label htmlFor="motivo">Motivo de consulta (opcional)</Label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Describe brevemente el motivo de tu consulta"
                className="mt-2 flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setPaso("resultados")} disabled={reservar.isPending}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={() => reservar.mutate()} disabled={reservar.isPending}>
            {reservar.isPending ? "Reservando..." : "Confirmar reserva"}
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PASO: RESULTADOS
  // -------------------------------------------------------------------------
  if (paso === "resultados") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setPaso("buscar")}>
          <ArrowLeft className="w-4 h-4" /> Modificar búsqueda
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">Disponibilidad de {criterios.especialidad}</h1>
          <p className="text-muted-foreground mt-1">
            {cupos.length} {cupos.length === 1 ? "opción encontrada" : "opciones encontradas"}
            {criterios.usarUbicacion && " · ordenadas por cercanía"}
          </p>
        </div>

        {cupos.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <p className="font-medium">No hay cupos con esos criterios</p>
              <p className="text-sm text-muted-foreground">
                Intenta ampliar el rango de búsqueda o cambiar el distrito.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cupos.map((cupo, idx) => (
              <CupoCard
                key={`${cupo.medico_id}-${cupo.fecha}-${cupo.hora}-${idx}`}
                cupo={cupo}
                onSeleccionar={() => {
                  setSeleccion(cupo);
                  setPaso("confirmar");
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PASO: BUSCAR
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reservar cita médica</h1>
        <p className="text-muted-foreground mt-1">
          Buscaremos disponibilidad en hospitales del MINSA y EsSalud según tus preferencias.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="esp">Especialidad</Label>
            <Select
              value={criterios.especialidad}
              onValueChange={(v) => setCriterios((c) => ({ ...c, especialidad: v }))}
            >
              <SelectTrigger id="esp">
                <SelectValue placeholder="Selecciona una especialidad" />
              </SelectTrigger>
              <SelectContent>
                {especialidades.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="distrito">Distrito (opcional)</Label>
            <Input
              id="distrito"
              placeholder="Ej. San Martín de Porres"
              value={criterios.distrito}
              onChange={(e) => setCriterios((c) => ({ ...c, distrito: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Institución (opcional)</Label>
            <Select
              value={criterios.tipo_institucion}
              onValueChange={(v) =>
                setCriterios((c) => ({ ...c, tipo_institucion: v === "todas" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Cualquier institución" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Cualquier institución</SelectItem>
                <SelectItem value="MINSA">MINSA</SelectItem>
                <SelectItem value="EsSalud">EsSalud</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "rounded-lg border p-4 flex items-start gap-3",
              criterios.usarUbicacion ? "border-primary bg-primary/5" : "border-input bg-secondary/40",
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-card border grid place-items-center shrink-0">
              <Crosshair
                className={cn("w-4 h-4", criterios.usarUbicacion ? "text-primary" : "text-muted-foreground")}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Usar mi ubicación</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {criterios.usarUbicacion
                  ? "Ordenaremos hospitales por cercanía a tu ubicación actual."
                  : "Permitirá ordenar resultados por la distancia desde tu posición."}
              </p>
            </div>
            <Button
              variant={criterios.usarUbicacion ? "outline" : "default"}
              size="sm"
              onClick={pedirUbicacion}
              type="button"
            >
              {criterios.usarUbicacion ? "Activada" : "Activar"}
            </Button>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!criterios.especialidad || buscar.isPending}
            onClick={() => buscar.mutate()}
          >
            <Search className="w-4 h-4" />
            {buscar.isPending ? "Buscando..." : "Buscar disponibilidad"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CupoCard({ cupo, onSeleccionar }: { cupo: Cupo; onSeleccionar: () => void }) {
  const fecha = new Date(`${cupo.fecha}T${cupo.hora}`);
  const fechaFmt = fecha.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
  const horaFmt = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="space-y-2.5 min-w-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{cupo.hospital_nombre}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span className={cupo.hospital_tipo === "MINSA" ? "badge-accent" : "badge-info"}>
                  {cupo.hospital_tipo}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {cupo.hospital_distrito}
                </span>
                {cupo.distancia_km != null && (
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3 h-3" /> {cupo.distancia_km} km
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pl-14">
            <span className="flex items-center gap-1.5 text-foreground">
              <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
              {cupo.medico_nombre}
            </span>
            <span className="flex items-center gap-1.5 text-foreground capitalize">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {fechaFmt}
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {horaFmt}
            </span>
          </div>
        </div>

        <Button onClick={onSeleccionar} className="md:w-auto w-full shrink-0">
          Seleccionar
        </Button>
      </CardContent>
    </Card>
  );
}

function DetalleItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right", className)}>{value}</span>
    </div>
  );
}
