import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, AlertCircle, Scan } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const scannerId = 'html5-barcode-scanner-node';

    const timeout = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            const cleaned = decodedText.trim();
            scanner.clear().catch(() => {});
            onScanSuccess(cleaned);
          },
          () => {}
        );
      } catch (err: any) {
        setErrorMsg('Camera access failed. Please allow camera permissions.');
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-red-500 animate-pulse" />
            <h3 className="text-base font-bold">Scan TV Barcode</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-slate-600 mb-3 text-center">
            Point camera at sticker barcode to open the repair ticket instantly.
          </p>

          <div id="html5-barcode-scanner-node" className="w-full rounded-2xl overflow-hidden min-h-[260px] bg-slate-100 border border-slate-200" />

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};