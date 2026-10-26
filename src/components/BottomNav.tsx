"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Beranda", icon: "🏠" },
  { href: "/riwayat", label: "Riwayat", icon: "📋" },
  { href: "/tambah", label: "Tambah", icon: "plus", isCenter: true },
  { href: "/laporan", label: "Laporan", icon: "📊" },
  { href: "/pengaturan", label: "Setelan", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 print:hidden shadow-lg backdrop-blur-md">
      <div className="max-w-lg mx-auto flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = pathname === item.href;
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-5 flex flex-col items-center group"
                aria-label="Tambah Transaksi"
              >
                <div className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 dark:shadow-blue-900/50 active:scale-95 transition-transform">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.75}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[10px] mt-1 text-slate-600 dark:text-slate-400 font-semibold group-hover:text-blue-600 transition-colors">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 min-w-[60px] transition-colors ${
                active
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
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
