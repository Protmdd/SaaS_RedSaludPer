import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

/**
 * Tipografía: se usa una pila de fuentes del sistema expuesta como variable
 * CSS (--font-sans, definida en globals.css). Evita depender de la descarga
 * de Google Fonts en tiempo de build —lo que rompía compilaciones sin red— y
 * ofrece una apariencia nativa y consistente en cada sistema operativo. Si se
 * desea Inter en producción, basta reintroducir next/font/google con red
 * disponible.
 */

export const metadata: Metadata = {
  title: "RedSalud · Plataforma de coordinación de citas médicas",
  description:
    "Reserva citas médicas en hospitales del MINSA y EsSalud, consulta disponibilidad en tiempo real y gestiona tu historial clínico.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
