import { Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ConnectionBadge = () => {
  const { isOnline } = useAuth();
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        isOnline
          ? 'bg-eligible/10 text-eligible border-eligible/30'
          : 'bg-pending/10 text-pending border-pending/30'
      }`}
      title={isOnline ? 'Connected to server' : 'No internet connection — offline mode active'}
    >
      {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
      {isOnline ? 'Online' : 'Offline mode'}
    </div>
  );
};

export default ConnectionBadge;
