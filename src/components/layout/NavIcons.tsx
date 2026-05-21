import React from 'react';
import {
  Home, CheckCircle2, DollarSign, Users, Award, Briefcase, KeyRound,
  Clock, CalendarDays, Calendar, MessageSquare, Shirt, CreditCard,
  UserCircle, BarChart3, Trash2, LogOut, Settings, ShieldCheck,
  Sun, Moon, ChevronLeft, ChevronRight, LayoutGrid, Share2, SlidersHorizontal,
} from 'lucide-react';

const ICON_MAP = {
  Home, CheckCircle2, DollarSign, Users, Award, Briefcase, KeyRound,
  Clock, CalendarDays, Calendar, MessageSquare, Shirt, CreditCard,
  UserCircle, BarChart3, Trash2, LogOut, Settings, ShieldCheck,
  Sun, Moon, ChevronLeft, ChevronRight, LayoutGrid, Share2, SlidersHorizontal,
} as const;

type IconName = keyof typeof ICON_MAP;

interface NavIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const NavIcon: React.FC<NavIconProps> = ({ name, size = 18, className }) => {
  const Icon = ICON_MAP[name as IconName];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
};
