import {
  Award,
  Banknote,
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Gift,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MinusCircle,
  QrCode,
  Receipt,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserCircle,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  path?: string;
  menuKey?: string;
  subItems?: MenuItem[];
};

export type ApiMenuNode = {
  key: string;
  label: string;
  icon?: string | null;
  path?: string | null;
  children?: ApiMenuNode[];
};

const iconMap: Record<string, LucideIcon> = {
  Award,
  Banknote,
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Gift,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MinusCircle,
  QrCode,
  Receipt,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserCircle,
  Users,
  Wallet,
  Zap,
};

export const mapApiMenuTree = (nodes: ApiMenuNode[]): MenuItem[] =>
  nodes.map((node) => ({
    label: node.label,
    icon: node.icon ? iconMap[node.icon] : undefined,
    path: node.path ?? undefined,
    menuKey: node.key,
    subItems: node.children?.length ? mapApiMenuTree(node.children) : undefined,
  }));
