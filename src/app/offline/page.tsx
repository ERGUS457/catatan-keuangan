export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950 text-center">
      <div className="space-y-3">
        <p className="text-5xl">📶</p>
        <h1 className="text-xl font-bold text-white">Anda Sedang Offline</h1>
        <p className="text-sm text-slate-400 max-w-xs">
          Koneksi internet Anda terputus. Buka kembali aplikasi setelah terhubung ke internet.
        </p>
      </div>
    </div>
  );
}
