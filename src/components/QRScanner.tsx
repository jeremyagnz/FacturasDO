import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      onScan(result[0].rawValue);
    }
  };

  const handleError = (err: any) => {
    console.error("QR Scanner Error:", err);
    if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
      setError("No se pudo acceder a la cámara. Por favor, verifica los permisos.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:p-4 backdrop-blur-sm">
      <div className="bg-white sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md relative flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 pb-4 flex-shrink-0 relative z-10 bg-white shadow-sm">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          <h3 className="text-xl font-bold mb-2 text-zinc-900">Escanear Factura</h3>
          <p className="text-sm text-zinc-500 pr-8">
            Apunta la cámara al código QR de la factura electrónica (e-CF).
          </p>
        </div>
        
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px]">
          {error ? (
            <div className="p-4 m-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <Camera size={18} />
              {error}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                formats={['qr_code']}
                components={{
                  finder: true,
                }}
                styles={{
                  container: {
                    width: '100%',
                    height: '100%',
                  },
                  video: {
                    objectFit: 'cover'
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
