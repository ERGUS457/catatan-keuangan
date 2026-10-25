"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Beranda", icon: "🏠" },
  { href: "/riwayat", label: "Riwayat", icon: "📋" },
  { href: "/tambah", label: "Tambah", icon: "➕", isCenter: true },
  { href: "/laporan", label: "Laporan", icon: "📊" },
  { href: "/pengaturan", label: "Setelan", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 print:hidden">
      <div className="max-w-lg mx-auto flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = pathname === item.href;
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-5 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-blue-900/50 active:scale-95 transition-transform">
                  {item.icon}
                </div>
                <span className="text-[10px] mt-1 text-slate-400">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 min-w-[60px] ${
                active ? "text-blue-400" : "text-slate-500"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
