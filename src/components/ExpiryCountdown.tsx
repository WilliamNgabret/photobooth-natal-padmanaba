import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { getExpiryInfo } from '@/lib/expiryUtils';

interface ExpiryCountdownProps {
  createdAt: string;
  onExpired?: () => void;
  variant?: 'default' | 'compact';
}

export function ExpiryCountdown({ createdAt, onExpired, variant = 'default' }: ExpiryCountdownProps) {
  const [expiryInfo, setExpiryInfo] = useState(() => getExpiryInfo(createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const info = getExpiryInfo(createdAt);
      setExpiryInfo(info);
      
      if (info.isExpired && onExpired) {
        onExpired();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, onExpired]);

  if (expiryInfo.isExpired) {
    return (
      <div className="flex items-center gap-1 text-destructive">
        <AlertTriangle className="w-4 h-4" />
        <span className={variant === 'compact' ? 'text-xs' : 'text-sm'}>Expired</span>
      </div>
    );
  }

  // Warn if less than 1 hour remaining
  const isWarning = expiryInfo.remainingMs < 60 * 60 * 1000;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 text-xs ${isWarning ? 'text-orange-500' : 'text-muted-foreground'}`}>
        <Clock className="w-3 h-3" />
        <span className="font-mono">{expiryInfo.remainingFormatted}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${isWarning ? 'text-orange-500' : 'text-muted-foreground'}`}>
      <Clock className="w-4 h-4" />
      <span className="text-sm">
        Expires in <span className="font-mono font-medium">{expiryInfo.remainingFormatted}</span>
      </span>
    </div>
  );
}
