"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconPackage,
  IconClipboardList,
  IconTruckDelivery,
  IconPackageImport,
  IconArrowsExchange,
  IconClipboardCheck,
  IconBuildingCommunity,
  IconReport,
  IconUsers,
  IconCategory,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function SidebarNav({ showUsers, showProjects }: { showUsers: boolean; showProjects: boolean }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <IconLayoutDashboard size={18} stroke={1.75} /> },
    { href: "/materials", label: "Materials", icon: <IconPackage size={18} stroke={1.75} /> },
    { href: "/categories", label: "หมวดหมู่วัสดุ", icon: <IconCategory size={18} stroke={1.75} /> },
    { href: "/material-issues", label: "คำขอเบิกวัสดุ", icon: <IconClipboardList size={18} stroke={1.75} /> },
    { href: "/purchase-orders", label: "ใบสั่งซื้อ", icon: <IconTruckDelivery size={18} stroke={1.75} /> },
    { href: "/goods-receives", label: "รับวัสดุ", icon: <IconPackageImport size={18} stroke={1.75} /> },
    { href: "/stock-transfers", label: "โอนย้ายระหว่างคลัง", icon: <IconArrowsExchange size={18} stroke={1.75} /> },
    { href: "/stock-counts", label: "นับสต๊อก", icon: <IconClipboardCheck size={18} stroke={1.75} /> },
    ...(showProjects
      ? [{ href: "/projects", label: "โครงการ", icon: <IconBuildingCommunity size={18} stroke={1.75} /> }]
      : []),
    { href: "/reports", label: "รายงาน", icon: <IconReport size={18} stroke={1.75} /> },
    ...(showUsers ? [{ href: "/users", label: "ผู้ใช้งาน", icon: <IconUsers size={18} stroke={1.75} /> }] : []),
  ];

  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "sidebar-link sidebar-link-active" : "sidebar-link"}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
