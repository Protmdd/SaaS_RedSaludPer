"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Calendar, MapPin, Stethoscope, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

interface CitaResumen {
  id: string;
  numero_cita: string;
  fecha: string;
  hora: string;
  hospital_nombre: string;
  medico_nombre: string;
  especialidad: string;
  estado: string;
}

/**
 * Pantalla de inicio del portal.
 *
 * Saluda al paciente, ofrece el acceso primario (reservar) en posición
 * dominante y resume sus citas próximas. Si no hay citas, invita
 * directamente a reservar la primera.
 */
export default function PortalHome() {
  const usuario = useAuth((s) => s.usuario);

  const { data: citas = [], isLoading } = useQuery<CitaResumen[]>({
    queryKey: ["mis-citas"],
    queryFn: async () => (await api.get<CitaResumen[]>("/citas/")).data,
  });

  const proximas = citas
    .filter((c) => ["Confirmada", "Pendiente", "Reprogramada"].includes(c.estado))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div>
        <p className="text-sm text-muted-foreground">Hola, bienvenido</p>
        <h1 className="text-3xl font-semibold mt-1">{usuario?.nombres}</h1>
      </div>

      {/* CTA principal */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-semibold leading-tight">¿Necesitas una cita?</h2>
            <p className="text-primary-foreground/85">
              Busca disponibilidad en hospitales del MINSA y EsSalud cerca de ti, sin colas ni llamadas.
            </p>
          </div>
          <Button asChild variant="secondary" size="lg" className="shrink-0">
            <Link href="/portal/reservar">
              <CalendarPlus className="w-4 h-4" />
              Reservar ahora <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Citas próximas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Próximas citas</h3>
          {citas.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/portal/mis-citas">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando tus citas...</p>
        ) : proximas.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-secondary mx-auto grid place-items-center">
                <Calendar className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">Aún no tienes citas programadas</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Cuando reserves tu primera cita, aparecerá aquí con todos los detalles del establecimiento.
              </p>
              <Button asChild className="mt-2">
                <Link href="/portal/reservar">Reservar mi primera cita</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {proximas.map((cita) => (
              <CitaCard key={cita.id} cita={cita} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CitaCard({ cita }: { cita: CitaResumen }) {
  const fecha = new Date(`${cita.fecha}T${cita.hora}`);
  const fechaFmt = fecha.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const horaFmt = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold capitalize truncate">{fechaFmt} · {horaFmt}</p>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
            <Stethoscope className="w-3.5 h-3.5 shrink-0" /> {cita.especialidad} ·{" "}
            <MapPin className="w-3.5 h-3.5 shrink-0" /> {cita.hospital_nombre}
          </p>
        </div>
        <span className="badge-info shrink-0">{cita.estado}</span>
      </CardContent>
    </Card>
  );
}
