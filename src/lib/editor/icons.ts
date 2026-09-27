import { icons } from "lucide-react";

export const ICON_CATEGORIES: Record<string, string[]> = {
  Business: ["Briefcase", "Building2", "Handshake", "Target", "Award", "Flag", "Rocket", "Lightbulb"],
  Finance: ["DollarSign", "Wallet", "PiggyBank", "CreditCard", "Banknote", "Coins", "TrendingUp", "Receipt"],
  Technology: ["Cpu", "Cloud", "Server", "Database", "Code", "Smartphone", "Wifi", "ShieldCheck"],
  People: ["Users", "User", "UserCheck", "GraduationCap", "HeartHandshake", "Smile", "Contact", "Baby"],
  Communication: ["MessageSquare", "Mail", "Phone", "Megaphone", "Send", "Share2", "Globe", "Bell"],
  Analytics: ["ChartColumn", "ChartLine", "ChartPie", "Activity", "Gauge", "TrendingDown", "Sigma", "Percent"],
  Operations: ["Settings", "Cog", "Wrench", "Truck", "Package", "Factory", "Workflow", "ClipboardCheck"],
  General: ["Star", "Check", "CircleCheck", "Clock", "Calendar", "MapPin", "Zap", "Layers"],
};

for (const key of Object.keys(ICON_CATEGORIES)) {
  ICON_CATEGORIES[key] = ICON_CATEGORIES[key]!.filter((n) => n in icons);
}

export const ALL_ICON_NAMES = Object.keys(icons);

export function searchIcons(query: string, limit = 64): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_ICON_NAMES.filter((n) => n.toLowerCase().includes(q)).slice(0, limit);
}

export function getIcon(name: string) {
  return icons[name as keyof typeof icons] ?? icons.Circle;
}
