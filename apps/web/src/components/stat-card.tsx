interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-zinc-100">{value}</div>
    </div>
  );
}
