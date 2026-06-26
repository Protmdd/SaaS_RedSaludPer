"use client";

import { CircleUserRound, Mail, Phone, MapPin, Shield, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

/**
 * Vista del perfil del paciente.
 *
 * Obtiene el perfil completo desde el backend (identidad + datos personales)
 * en lugar de depender solo de la identidad mínima almacenada en sesión. La
 * edición de perfil queda fuera de esta versión; en producción incluiría
 * modificación de datos de contacto y cambio de contraseña.
 */
interface PerfilPaciente {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  celular: string;
  direccion: string | null;
  distrito: string;
  tipo_seguro: string;
  fecha_nacimiento: string;
  genero: string;
}

export default function PerfilPage() {
  const { data: paciente, isLoading } = useQuery<PerfilPaciente>({
    queryKey: ["mi-perfil"],
    queryFn: async () => (await api.get<PerfilPaciente>("/auth/mi-perfil")).data,
  });

  if (isLoading || !paciente) {
    return <p className="text-sm text-muted-foreground">Cargando perfil...</p>;
  }

  const fechaNac = new Date(paciente.fecha_nacimiento).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-muted-foreground mt-1">Datos personales registrados en la plataforma.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary grid place-items-center">
              <CircleUserRound className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold">
                {paciente.nombres} {paciente.apellidos}
              </p>
              <p className="text-sm text-muted-foreground">DNI: {paciente.dni}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
            <Campo icon={<Mail className="w-4 h-4" />} label="Correo electrónico" value={paciente.email} />
            <Campo icon={<Phone className="w-4 h-4" />} label="Celular" value={paciente.celular} />
            <Campo icon={<Calendar className="w-4 h-4" />} label="Fecha de nacimiento" value={fechaNac} />
            <Campo icon={<CircleUserRound className="w-4 h-4" />} label="Género" value={paciente.genero} />
            <Campo icon={<MapPin className="w-4 h-4" />} label="Distrito" value={paciente.distrito} />
            <Campo icon={<Shield className="w-4 h-4" />} label="Tipo de seguro" value={paciente.tipo_seguro} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-md bg-secondary text-muted-foreground grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
