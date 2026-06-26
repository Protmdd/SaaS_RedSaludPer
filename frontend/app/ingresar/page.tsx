"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Stethoscope, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

const schema = z.object({
  identificador: z.string().min(4, "DNI o correo requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function IngresarPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const { data: respuesta } = await api.post("/auth/login", data);
      const { usuario, tokens } = respuesta;
      setSession(usuario, tokens.access_token);
      toast({
        title: "Bienvenido de vuelta",
        description: `${usuario.nombres} ${usuario.apellidos}`,
        variant: "success",
      });
      // Redirige al área correspondiente al rol del usuario.
      router.push(usuario.ruta_inicio || "/portal");
    } catch (err) {
      toast({ title: "No se pudo iniciar sesión", description: getErrorMessage(err), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center gap-2 justify-center">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xl">RedSalud</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Ingresar a tu cuenta</CardTitle>
            <CardDescription>Usa tu DNI o correo electrónico para acceder.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identificador">DNI o correo</Label>
                <Input
                  id="identificador"
                  placeholder="12345678 o correo@dominio.com"
                  autoComplete="username"
                  {...register("identificador")}
                />
                {errors.identificador && (
                  <p className="text-xs text-destructive">{errors.identificador.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <LogIn className="w-4 h-4" />
                {submitting ? "Ingresando..." : "Ingresar"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <Link href="/registro" className="text-primary hover:underline font-medium">
                  Regístrate aquí
                </Link>
              </p>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-2">Cuentas de demostración</p>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <CredencialDemo rol="Paciente" usuario="paciente@demo.pe" clave="paciente123" />
                <CredencialDemo rol="Médico" usuario="medico@demo.pe" clave="medico123" />
                <CredencialDemo rol="Admin" usuario="admin@demo.pe" clave="admin123" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-2">Cuentas de demostración</p>
              <div className="grid gap-1.5 text-xs">
                <DemoCred rol="Paciente" usuario="paciente@demo.pe" clave="paciente123" />
                <DemoCred rol="Médico" usuario="medico@demo.pe" clave="medico123" />
                <DemoCred rol="Administrador" usuario="admin@demo.pe" clave="admin123" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CredencialDemo({ rol, usuario, clave }: { rol: string; usuario: string; clave: string }) {
  return (
    <div className="rounded-md border bg-secondary/50 p-2 text-center">
      <p className="font-semibold text-foreground">{rol}</p>
      <p className="text-muted-foreground truncate" title={usuario}>{usuario}</p>
      <p className="text-muted-foreground">{clave}</p>
    </div>
  );
}

function DemoCred({ rol, usuario, clave }: { rol: string; usuario: string; clave: string }) {
  return (
    <div className="flex items-center justify-between bg-secondary/60 rounded px-2.5 py-1.5">
      <span className="font-medium text-foreground">{rol}</span>
      <span className="text-muted-foreground font-mono">
        {usuario} · {clave}
      </span>
    </div>
  );
}
