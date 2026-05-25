import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ isOpen, onClose, onScan, title = "Scanner", description = "Scannez un QR code ou un code-barres" }) {
    const scannerRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        const html5QrCode = new Html5Qrcode("modal-qr-reader");
        scannerRef.current = html5QrCode;

        html5QrCode
            .start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    // On peut spécifier les formats ici si besoin, mais par défaut il prend tout
                },
                (decodedText) => {
                    html5QrCode.stop().then(() => {
                        onScan(decodedText);
                    }).catch(() => {
                        onScan(decodedText);
                    });
                },
                () => { }, // erreur silencieuse (pas de code détecté)
            )
            .then(() => setScanning(true))
            .catch((err) => {
                const errStr = String(err);
                if (errStr.includes("NotAllowedError")) {
                    setError("Accès refusé. La caméra nécessite HTTPS ou 'localhost'. Si vous êtes sur téléphone distant, vous devez utiliser un tunnel sécurisé (ex: ngrok).");
                } else if (errStr.includes("NotFoundError") || errStr.includes("devices not found")) {
                    setError("Aucune caméra détectée sur cet appareil.");
                } else {
                    setError("Erreur caméra : " + errStr);
                }
            });

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, [isOpen, onScan]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-lg">
                            📷
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{title}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {description}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-xl font-bold transition-colors"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    <div
                        id="modal-qr-reader"
                        className="rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 aspect-square"
                    />
                    {scanning && (
                        <p className="text-center text-[10px] text-slate-400 mt-4 animate-pulse font-bold uppercase tracking-widest">
                            Pointez la caméra vers le code...
                        </p>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-center text-xs text-red-500 font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}
