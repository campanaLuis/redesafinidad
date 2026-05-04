import { QrCode, Camera, MapPin, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NetworkEventsViewProps {
  hashCode: string;
}

const proximosEventos = [
  {
    nombre: "Feria del Libro",
    fecha: "15 de Abril, 2026 · 10:00 AM",
    ubicacion: "Centro de Convenciones, CDMX",
    link: "https://maps.google.com/?q=Centro+de+Convenciones+CDMX",
  },
];

const eventosAtendidos = [
  {
    nombre: "Jornada Ciudadana 2026",
    fecha: "2 de Marzo, 2026 · 9:00 AM",
    ubicacion: "Plaza Principal, Monterrey",
    link: "https://maps.google.com/?q=Plaza+Principal+Monterrey",
    registrado: "2 Mar 2026, 9:12 AM",
  },
];

export function NetworkEventsView({ hashCode }: NetworkEventsViewProps) {
  return (
    <div className="w-full flex flex-col gap-4">

      {/* Próximos Eventos */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Próximos eventos</h3>
        </div>
        <div className="p-3 flex flex-col gap-2">
          {proximosEventos.map((ev, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 flex flex-col gap-1.5">
              <p className="font-medium text-foreground text-sm">{ev.nombre}</p>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{ev.fecha}</span>
              </div>
              <a
                href={ev.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary text-xs hover:underline"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{ev.ubicacion}</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Eventos Atendidos */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-foreground text-sm">Eventos atendidos</h3>
        </div>
        <div className="p-3 flex flex-col gap-2">
          {eventosAtendidos.map((ev, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground text-sm">{ev.nombre}</p>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">Asistió</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{ev.fecha}</span>
              </div>
              <a
                href={ev.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary text-xs hover:underline"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{ev.ubicacion}</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Registrar Asistencia QR */}
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <QrCode className="h-7 w-7 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground text-sm mb-1">Registrar asistencia</h3>
          <p className="text-muted-foreground text-xs">
            Escanea el código QR del evento para registrar tu asistencia
          </p>
        </div>
        <Button className="w-full gap-2" disabled>
          <Camera className="h-4 w-4" />
          Escanear código QR
        </Button>
        <p className="text-muted-foreground/60 text-[10px]">Próximamente</p>
      </div>
    </div>
  );
}
