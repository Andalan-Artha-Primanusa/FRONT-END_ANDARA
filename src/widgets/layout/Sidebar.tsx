import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Banknote, Building2, CalendarDays, BriefcaseBusiness, ChevronRight, Clock3, FileText, GraduationCap, Newspaper, Smartphone, Target, WalletCards, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

import type { MenuItem } from '@/shared/config/menu';
import { useAuthStore } from '@/app/store/auth.store';
import { fetchAllowedMenuKeys, fetchUserMenuTree } from '@/shared/config/menuFilter';
import { companyService } from '@/features/company/api/company.service';
import { queueCompanyScopeToast } from '@/shared/utils/companyScope';

interface SidebarProps {
  collapsed: boolean;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const checkIsActive = (item: MenuItem, pathname: string): boolean => {
  if (item.path && pathname === item.path) return true;
  if (item.subItems) {
    return item.subItems.some(sub => checkIsActive(sub, pathname));
  }
  return false;
};

const MenuItemComponent: React.FC<{
  item: MenuItem;
  collapsed: boolean;
  level: number;
}> = ({ item, collapsed, level }) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasSubItems = item.subItems && item.subItems.length > 0;
  const Icon = item.icon;
  const isActive = checkIsActive(item, location.pathname);

  useEffect(() => {
    if (isActive) setIsExpanded(true);
  }, [isActive]);

  const paddingLeft = !collapsed && level > 0 ? `${0.75 + level * 1.25}rem` : undefined;

  if (hasSubItems) {
    return (
      <li className="menu-item-wrapper">
        <div
          className={clsx(
            'menu-item',
            'has-submenu',
            isActive && 'active',
            collapsed && 'collapsed'
          )}
          onClick={() => !collapsed && setIsExpanded(!isExpanded)}
          title={collapsed ? item.label : undefined}
          style={{ paddingLeft }}
        >
          {Icon && <Icon size={20} className="menu-icon" />}
          {!collapsed && (
            <>
              <span className="menu-label">{item.label}</span>
              <span className={clsx('menu-chevron', isExpanded && 'expanded')}>
                <ChevronRight size={16} />
              </span>
            </>
          )}
        </div>
        {!collapsed && (
          <div className={clsx('submenu-wrapper', isExpanded && 'expanded')}>
            <ul className="submenu-list">
              {item.subItems!.map((subItem, idx) => (
                <MenuItemComponent
                  key={idx}
                  item={subItem}
                  collapsed={collapsed}
                  level={level + 1}
                />
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="menu-item-wrapper">
      <NavLink
        to={item.path ?? '#'}
        end
        className={({ isActive: isLinkActive }) =>
          clsx(
            level > 0 ? 'submenu-item' : 'menu-item',
            (isActive || isLinkActive) && 'active',
            collapsed && 'collapsed'
          )
        }
        title={collapsed ? item.label : undefined}
        style={{ paddingLeft }}
      >
        {Icon ? (
          <Icon size={20} className="menu-icon" />
        ) : (
          !collapsed && level > 0 && <span className="submenu-dot" />
        )}
        {!collapsed && <span className="menu-label">{item.label}</span>}
      </NavLink>
    </li>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, isMobileOpen, onClose }) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const selectedCompanyId = useAuthStore((state) => state.selectedCompanyId);
  const companyContext = useAuthStore((state) => state.companyContext);
  const setSelectedCompanyId = useAuthStore((state) => state.setSelectedCompanyId);
  const setCompanyContext = useAuthStore((state) => state.setCompanyContext);
  const [allowedKeys, setAllowedKeys] = useState<string[] | undefined>();
  const [menuTree, setMenuTree] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAllowedMenuKeys(user).then(setAllowedKeys);
    fetchUserMenuTree(user).then(setMenuTree).catch((error) => {
      console.error("Failed to load sidebar menu tree:", error);
      setMenuTree([]);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !token) {
      setCompanyContext(null);
      return;
    }
    if (companyContext) return;

    let cancelled = false;

    const loadCompanyContext = async () => {
      try {
        const context = await companyService.context();
        if (cancelled) return;
        setCompanyContext(context);

        if (selectedCompanyId === null) {
          setSelectedCompanyId(context.can_view_all ? "all" : context.selected_company_id ?? context.default_company_id);
        }
      } catch (error) {
        console.error("Failed to load sidebar company context:", error);
        if (!cancelled) setCompanyContext(null);
      }
    };

    void loadCompanyContext();

    return () => {
      cancelled = true;
    };
  }, [companyContext, selectedCompanyId, setCompanyContext, setSelectedCompanyId, token, user]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      fetchAllowedMenuKeys(user).then(setAllowedKeys);
      fetchUserMenuTree(user).then(setMenuTree).catch(() => setMenuTree([]));
    };
    window.addEventListener('menu-cache-cleared', handler);
    return () => window.removeEventListener('menu-cache-cleared', handler);
  }, [user]);

  const filteredItems = allowedKeys === undefined ? [] : menuTree;
  const presentationMode = Boolean(user && user.roles.length === 0 && user.permissions.length === 0);
  const visibleItems: MenuItem[] = presentationMode
    ? [
      {
        label: 'ANDARA Mobile',
        icon: Smartphone,
        path: '/andalan/mobile',
        subItems: [
          { label: 'Berita', icon: Newspaper, path: '/andalan/mobile/news' },
          { label: 'Roster', icon: CalendarDays, path: '/andalan/mobile/roster' },
          { label: 'Cuti & Izin', icon: FileText, path: '/andalan/mobile/leave' },
          { label: 'Reimburse', icon: WalletCards, path: '/andalan/mobile/reimburse' },
          { label: 'Perjalanan Dinas', icon: CalendarDays, path: '/andalan/mobile/trips' },
        ],
      },
      { label: 'ANDARA KPI', icon: Target, path: '/andalan/kpi' },
      {
        label: 'ANDARA Workforce',
        icon: BriefcaseBusiness,
        path: '/andalan/workforce/payroll',
        subItems: [
          { label: 'Payroll', icon: Banknote, path: '/andalan/workforce/payroll' },
          { label: 'Training', icon: GraduationCap, path: '/andalan/workforce/training' },
          { label: 'Asset', icon: BriefcaseBusiness, path: '/andalan/workforce/assets' },
          { label: 'Overtime', icon: Clock3, path: '/andalan/workforce/overtime' },
          { label: 'Dokumen', icon: FileText, path: '/andalan/workforce/documents' },
        ],
      },
      ...filteredItems,
    ]
    : filteredItems;

  // When mobile drawer is open, always show full expanded sidebar regardless of collapsed state
  const effectiveCollapsed = isMobileOpen ? false : collapsed;
const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const isAll = value === "all";
    const companyLabel = isAll
      ? "HO / Semua Company"
      : companyContext?.companies.find((company) => company.id === Number(value))?.name
        ? `${companyContext.companies.find((company) => company.id === Number(value))?.name}`
        : `company #${value}`;
    setSelectedCompanyId(isAll ? "all" : Number(value));
    queueCompanyScopeToast(companyLabel || "");
    window.dispatchEvent(new Event("company-context-changed"));
    setTimeout(() => window.location.reload(), 50);
  };

  return (
    <aside className={clsx('dashboard-sidebar', collapsed && 'collapsed', isMobileOpen && 'mobile-open')}>
      <div className="sidebar-logo">
        {isMobileOpen && (
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close menu"
          >
            <X size={24} />
          </button>
        )}
        <img
          src="/app-logo.png"
          alt="ANDARA Logo"
          className={clsx('company-logo', effectiveCollapsed && 'collapsed')}
        />
      </div>

      {companyContext && companyContext.companies.length > 0 && !effectiveCollapsed && (
        <label className="sidebar-company-switcher" title="Ganti scope company">
          <span className="sidebar-company-caption">Company aktif</span>
          <span className="sidebar-company-control">
            <Building2 size={17} aria-hidden="true" />
            <select
              aria-label="Ganti company aktif"
              value={selectedCompanyId ?? (companyContext.can_view_all ? "all" : companyContext.selected_company_id ?? companyContext.default_company_id ?? "")}
              onChange={handleCompanyChange}
            >
              {companyContext.can_view_all && <option value="all">HO / Semua Company</option>}
              {companyContext.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}{company.code ? ` (${company.code})` : ""}
                </option>
              ))}
            </select>
          </span>
        </label>
      )}

      <div className="sidebar-menu-container">
        <ul className="menu-list">
          {visibleItems.map((item, idx) => (
            <MenuItemComponent
              key={idx}
              item={item}
              collapsed={effectiveCollapsed}
              level={0}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
};
