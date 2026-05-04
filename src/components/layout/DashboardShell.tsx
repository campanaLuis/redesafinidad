import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { appMainPaddingClass, appShellBg, mobilePageHeaderClass, mobilePageTitleClass } from "@/lib/appUi";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  /**
   * Clase aplicada al wrapper interno que apila los hijos de la página.
   * Por defecto es un flex-column de altura completa donde el ÚLTIMO hijo
   * crece para llenar el espacio sobrante; ideal para que la zona de tabla/lista
   * tenga scroll interno mientras header y KPIs quedan fijos.
   */
  stackClassName?: string;
};

/**
 * Stack por defecto: pila vertical con gap, altura completa, donde el último
 * hijo ocupa todo el espacio que sobre. Permite que las páginas pongan
 * header + KPIs arriba (estáticos) y la zona de datos (último hijo) tenga
 * scroll interno.
 */
const defaultStack =
  "flex h-full min-h-0 flex-col gap-3 [&>*:last-child]:flex-1 [&>*:last-child]:min-h-0";

export function DashboardShell({
  title,
  children,
  className,
  mainClassName,
  stackClassName = defaultStack,
}: Props) {
  return (
    <div className={cn("flex h-screen w-full overflow-hidden", appShellBg, className)}>
      <DashboardSidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className={mobilePageHeaderClass}>
          <span className={mobilePageTitleClass}>{title}</span>
        </div>
        {/* Página: viewport exacto, sin scroll a nivel de página */}
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", appMainPaddingClass, mainClassName)}>
          <div className={cn(stackClassName)}>{children}</div>
        </div>
      </div>
    </div>
  );
}
