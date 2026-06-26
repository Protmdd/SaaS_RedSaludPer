"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { api, getErrorMessage } from "@/lib/api";

interface Medico {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  colegiatura: string;
  especialidad: string;
  activo: boolean;
}

const schema = z.object({
  nombres: z.string().min(2, "Requerido"),
  apellidos: z.string().min(2, "Requerido"),
  email: z.string().email("Correo inválido"),
  colegiatura: z.string().min(4, "Requerido"),
  especialidad: z.string().min(2, "Requerido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
type FormData = z.infer<typeof schema>;

export default function MedicosAdmin() {
  const qc = useQueryClient();
  const [mostrarForm, setMostrarForm] = React.useState(false);

  const { data: medicos = [], isLoading } = useQuery<Medico[]>({
    queryKey: ["admin-medicos"],
    queryFn: async () => (await api.get<Medico[]>("/admin-hospital/medicos")).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const crear = useMutation({
    mutationFn: async (data: FormData) => (await api.post("/admin-hospital/medicos", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-medicos"] });
      toast({ title: "Médico registrado", variant: "success" });
      reset();
      setMostrarForm(false);
    },
    onError: (e) => toast({ title: "No se pudo registrar", description: getErrorMessage(e), variant: "error" }),
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) =>
      (await api.patch(`/admin-hospital/medicos/${id}/estado?activo=${activo}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-medicos"] });
      toast({ title: "Estado actualizado", variant: "success" });
    },
    onError: (e) => toast({ title: "Error", description: getErrorMessage(e), variant: "error" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Médicos</h1>
          <p className="text-muted-foreground mt-1">Gestión de profesionales del establecimiento.</p>
        </div>
        <Button onClick={() => setMostrarForm((v) => !v)}>
          <UserPlus className="w-4 h-4" />
          {mostrarForm ? "Cancelar" : "Dar de alta médico"}
        </Button>
      </div>

      {mostrarForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuevo médico</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="grid sm:grid-cols-2 gap-4">
              <Campo label="Nombres" reg={register("nombres")} err={errors.nombres?.message} />
              <Campo label="Apellidos" reg={register("apellidos")} err={errors.apellidos?.message} />
              <Campo label="Correo" reg={register("email")} err={errors.email?.message} type="email" />
              <Campo label="Colegiatura (CMP)" reg={register("colegiatura")} err={errors.colegiatura?.message} />
              <Campo label="Especialidad" reg={register("especialidad")} err={errors.especialidad?.message} />
              <Campo label="Contraseña inicial" reg={register("password")} err={errors.password?.message} type="password" />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={crear.isPending}>
                  {crear.isPending ? "Registrando..." : "Registrar médico"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando médicos...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {medicos.map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {m.nombres} {m.apellidos}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {m.especialidad} · {m.colegiatura} · {m.email}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                      m.activo ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.activo ? "Activo" : "Inactivo"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cambiarEstado.mutate({ id: m.id, activo: !m.activo })}
                    disabled={cambiarEstado.isPending}
                  >
                    <Power className="w-4 h-4" />
                    {m.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Campo({
  label,
  reg,
  err,
  type = "text",
}: {
  label: string;
  reg: ReturnType<ReturnType<typeof useForm<FormData>>["register"]>;
  err?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} {...reg} />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
