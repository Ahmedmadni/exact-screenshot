import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Presentation as PresentationIcon,
  LayoutTemplate,
  Palette,
  FolderOpen,
  Languages,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/presentations", key: "nav.presentations", icon: PresentationIcon },
  { to: "/templates", key: "nav.templates", icon: LayoutTemplate },
  { to: "/brand-kits", key: "nav.brandKits", icon: Palette },
  { to: "/assets", key: "nav.assets", icon: FolderOpen },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, key, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "focus-ring group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active ? "text-accent" : "text-muted-foreground")} />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark() {
  const { t } = useI18n();
  return (
    <Link to="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="font-display text-base leading-none">M</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[15px] text-foreground">{t("brand.name")}</span>
        <span className="text-[11px] text-muted-foreground">AI Presentation Studio</span>
      </span>
    </Link>
  );
}

function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="focus-ring flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="flex items-center gap-2">
        <Languages className="size-4" />
        {lang === "en" ? "English" : "العربية"}
      </span>
      <span className="eyebrow">{lang === "en" ? "AR" : "EN"}</span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 z-30 hidden w-[248px] flex-col justify-between border-e border-border bg-surface px-4 py-5 lg:flex">
        <div className="flex flex-col gap-7">
          <BrandMark />
          <NavList />
        </div>
        <div className="flex flex-col gap-3">
          <LanguageToggle />
          <Link
            to="/settings"
            className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-foreground">
              A
            </span>
            Ahmed ELmadni
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <BrandMark />
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {open && (
        <div className="fixed inset-x-0 top-[57px] z-30 border-b border-border bg-surface px-4 py-4 lg:hidden">
          <NavList onNavigate={() => setOpen(false)} />
          <div className="mt-4">
            <LanguageToggle />
          </div>
        </div>
      )}

      <main className="ps-0 lg:ps-[248px]">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
