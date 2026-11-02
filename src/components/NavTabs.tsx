"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({ unread, isStaff }: { unread: number; isStaff: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Directory", active: path === "/" || path.startsWith("/alumni") },
    { href: "/internships", label: "Internships", active: path.startsWith("/internships") },
    { href: "/messages", label: "Messages", active: path.startsWith("/messages"), badge: unread },
    ...(isStaff ? [{ href: "/staff", label: "Staff review", active: path.startsWith("/staff") }] : []),
  ];
  return (
    <nav className="views" aria-label="Sections">
      <div className="wrap">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="vtab" aria-current={t.active ? "page" : undefined}>
            {t.label}
            {"badge" in t && t.badge ? <span className="badge">{t.badge}</span> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
