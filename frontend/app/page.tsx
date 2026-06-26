"use client";

import Link from "next/link";
import { Calendar, MapPin, Clock, Shield, ArrowRight, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página de inicio.
 *
 * Propuesta de valor centrada en lo que el paciente puede hacer en minutos:
 * encontrar una cita cerca, reservar online, ver su historial. Evita jerga
 * técnica y prioriza la acción primaria (reservar) en el primer vistazo.
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg">RedSalud</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/ingresar">Ingresar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 container py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
              MINSA y EsSalud · Lima Metropolitana
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Reserva tu cita médica en minutos, sin colas
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              RedSalud conecta los hospitales públicos para que puedas encontrar disponibilidad
              en tiempo real, elegir el establecimiento más cercano y reservar desde tu celular.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/registro">
                  Crear cuenta gratis <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/ingresar">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 animate-slide-up">
            <FeatureCard
              icon={<MapPin className="w-5 h-5" />}
              title="Cerca de ti"
              text="Encuentra hospitales por distancia desde tu ubicación."
            />
            <FeatureCard
              icon={<Calendar className="w-5 h-5" />}
              title="En tiempo real"
              text="Disponibilidad actualizada de cada médico y especialidad."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="En minutos"
              text="Sin colas, sin llamadas. Reserva desde el navegador."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Seguro"
              text="Tu información protegida según los estándares de salud."
            />
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t bg-card">
        <div className="container py-6 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} RedSalud · Plataforma académica</span>
          <span>Proyecto de infraestructura tecnológica</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="surface-elevated p-5">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-snug">{text}</p>
    </div>
  );
}
