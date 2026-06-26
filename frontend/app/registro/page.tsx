"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/**
 * Esquema de validación del formulario de registro.
 * Refleja las reglas del contrato `PacienteRegistro` del backend.
 */
const schema = z.object({
  dni: z.string().regex(/^\d{8}$/, "DNI debe tener exactamente 8 dígitos"),
  nombres: z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellido_paterno: z.string().min(2, "Mínimo 2 caracteres").max(50),
  apellido_materno: z.string().min(2, "Mínimo 2 caracteres").max(50),
  fecha_nacimiento: z.string().min(1, "Requerido"),
  genero: z.enum(["Masculino", "Femenino", "Otro"]),
  email: z.string().email("Correo no válido"),
  celular: z.string().regex(/^\+?\d{9,15}$/, "Celular no válido (9-15 dígitos)"),
  distrito: z.string().min(2, "Distrito requerido"),
  tipo_seguro: z.enum(["SIS", "EsSalud", "Privado", "Ninguno"]),
  password: z
    .string()
    .min(8, "Contraseña debe tener al menos 8 caracteres")
    .max(72, "Contraseña demasiado larga"),
});

type FormData = z.infer<typeof schema>;

const DISTRITOS_LIMA = [
  "Cercado de Lima", "Ate", "Barranco", "Breña", "Carabayllo", "Chorrillos", "Comas",
  "El Agustino", "Independencia", "Jesús María", "La Molina", "La Victoria", "Lince",
  "Los Olivos", "Lurín", "Magdalena del Mar", "Miraflores", "Pueblo Libre",
  "Puente Piedra", "Rímac", "San Borja", "San Isidro", "San Juan de Lurigancho",
  "San Juan de Miraflores", "San Luis", "San Martín de Porres", "San Miguel",
  "Santa Anita", "Santiago de Surco", "Surquillo", "Villa El Salvador", "Villa María del Triunfo",
];

export default function RegistroPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const { data: respuesta } = await api.post("/auth/registro", data);
      const { usuario, tokens } = respuesta;
      setSession(usuario, tokens.access_token);
      toast({ title: "Cuenta creada", description: "Bienvenido a RedSalud", variant: "success" });
      router.push(usuario.ruta_inicio || "/portal");
    } catch (err) {
      toast({ title: "No se pudo crear la cuenta", description: getErrorMessage(err), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen py-8 bg-background">
      <div className="container max-w-2xl space-y-6">
        <Link href="/" className="flex items-center gap-2 justify-center">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xl">RedSalud</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Crear cuenta de paciente</CardTitle>
            <CardDescription>
              Completa tus datos para reservar citas en hospitales del MINSA y EsSalud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Identidad */}
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Datos personales
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="DNI" error={errors.dni?.message}>
                    <Input placeholder="12345678" maxLength={8} {...register("dni")} />
                  </Field>
                  <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
                    <Input type="date" {...register("fecha_nacimiento")} />
                  </Field>
                </div>
                <Field label="Nombres" error={errors.nombres?.message}>
                  <Input placeholder="Juan Carlos" {...register("nombres")} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Apellido paterno" error={errors.apellido_paterno?.message}>
                    <Input placeholder="Pérez" {...register("apellido_paterno")} />
                  </Field>
                  <Field label="Apellido materno" error={errors.apellido_materno?.message}>
                    <Input placeholder="García" {...register("apellido_materno")} />
                  </Field>
                </div>
                <Field label="Género" error={errors.genero?.message}>
                  <Select onValueChange={(v) => setValue("genero", v as FormData["genero"])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </section>

              {/* Contacto */}
              <section className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Contacto
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Correo electrónico" error={errors.email?.message}>
                    <Input type="email" placeholder="tucorreo@ejemplo.com" {...register("email")} />
                  </Field>
                  <Field label="Celular" error={errors.celular?.message}>
                    <Input placeholder="987654321" {...register("celular")} />
                  </Field>
                </div>
                <Field label="Distrito" error={errors.distrito?.message}>
                  <Select onValueChange={(v) => setValue("distrito", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu distrito" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRITOS_LIMA.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </section>

              {/* Cobertura y acceso */}
              <section className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Cobertura y acceso
                </h4>
                <Field label="Tipo de seguro" error={errors.tipo_seguro?.message}>
                  <Select onValueChange={(v) => setValue("tipo_seguro", v as FormData["tipo_seguro"])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu seguro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIS">SIS</SelectItem>
                      <SelectItem value="EsSalud">EsSalud</SelectItem>
                      <SelectItem value="Privado">Privado</SelectItem>
                      <SelectItem value="Ninguno">Ninguno</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Contraseña" error={errors.password?.message}>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                </Field>
              </section>

              <Button type="submit" className="w-full" disabled={submitting}>
                <UserPlus className="w-4 h-4" />
                {submitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link href="/ingresar" className="text-primary hover:underline font-medium">
                  Ingresa aquí
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Campo de formulario etiquetado con manejo de errores. */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
