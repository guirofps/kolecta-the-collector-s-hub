import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface AuctionCountdownProps {
  endsAt: string;
  compact?: boolean;
  onEnd?: () => void;
}

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    ended: false,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AuctionCountdown({ endsAt, compact, onEnd }: AuctionCountdownProps) {
  const [time, setTime] = useState(() => getTimeLeft(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft(endsAt);
      setTime(t);
      if (t.ended) {
        clearInterval(interval);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onEnd]);

  if (time.ended) {
    return (
      <div className={`font-heading font-bold uppercase tracking-wider text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
        Encerrado
      </div>
    );
  }

  const isUrgent = time.days === 0 && time.hours < 1;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 font-heading text-[11px] font-bold uppercase tracking-wider ${isUrgent ? 'text-accent' : 'text-muted-foreground'}`}>
        <Timer className="h-3 w-3" />
        {time.days > 0 && `${time.days}d `}
        {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${isUrgent ? 'text-accent' : 'text-foreground'}`}>
      <Timer className={`h-4 w-4 ${isUrgent ? 'animate-countdown-tick' : ''}`} />
      <div className="flex items-center gap-1 font-heading font-bold tracking-wider">
        {time.days > 0 && (
          <TimeBlock value={time.days} label="D" />
        )}
        <TimeBlock value={time.hours} label="H" />
        <span className={`text-lg ${isUrgent ? 'text-accent' : 'text-primary'}`}>:</span>
        <TimeBlock value={time.minutes} label="M" />
        <span className={`text-lg ${isUrgent ? 'text-accent' : 'text-primary'}`}>:</span>
        <TimeBlock value={time.seconds} label="S" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl leading-none tabular-nums">{pad(value)}</span>
      <span className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}
