import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemLog } from '../types';
import { Activity, AlertCircle, AlertTriangle, Info, Search } from 'lucide-react';

interface SystemLogsProps {
  companyId?: string;
  isAdmin: boolean;
}

export function SystemLogs({ companyId, isAdmin }: SystemLogsProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let q;
    
    if (isAdmin) {
      // Admin sees all logs
      q = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    } else if (companyId) {
      // Company users see only their company logs
      q = query(
        collection(db, 'system_logs'),
        where('companyId', '==', companyId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: SystemLog[] = [];
      snapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as SystemLog);
      });
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, isAdmin]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return <AlertCircle className="text-red-500" size={16} />;
      case 'WARN': return <AlertTriangle className="text-yellow-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ERROR': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">ERROR</span>;
      case 'WARN': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">WARN</span>;
      default: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">INFO</span>;
    }
  };

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-100 rounded-xl">
              <Activity size={24} className="text-zinc-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Logs del Sistema</h2>
              <p className="text-sm text-zinc-500">Registro de actividades y cambios</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha y Hora</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Nivel</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuario</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Acción</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                    Cargando logs...
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  No se encontraron registros.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4 text-sm text-zinc-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      {getLevelBadge(log.level)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900">{log.userName || 'Usuario Desconocido'}</span>
                      <span className="text-xs text-zinc-500">{log.userEmail || log.userId}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-900 font-medium">
                    {log.message}
                  </td>
                  <td className="p-4 text-sm text-zinc-500 max-w-xs truncate" title={log.details}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
