interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

export default function StatsCard({ icon, label, value, className = '' }: StatsCardProps) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5 ${className}`}>
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        <span className="w-5 h-5">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-50">{value}</p>
    </div>
  );
}
