"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface QrScannerViewProps {
  onScanSuccess: (rawValue: string) => void;
  onClose?: () => void;
}

type CameraStatus = "idle" | "starting" | "active" | "denied" | "unsupported" | "error";

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; format?: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

export default function QrScannerView({ onScanSuccess, onClose }: QrScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedLockRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [retryKey, setRetryKey] = useState<number>(0);
  const [manualCode, setManualCode] = useState<string>("");

  const stopScanner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleDetected = useCallback(
    (value: string) => {
      const cleaned = value.trim();
      if (!cleaned || scannedLockRef.current) return;
      scannedLockRef.current = true;
      stopScanner();
      onScanSuccess(cleaned);
    },
    [onScanSuccess, stopScanner]
  );

  useEffect(() => {
    let cancelled = false;

    const runScanner = async () => {
      stopScanner();
      scannedLockRef.current = false;

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraStatus("unsupported");
          setErrorMessage("Thiết bị hoặc trình duyệt không hỗ trợ truy cập camera.");
        }
        return;
      }

      const DetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
        .BarcodeDetector;
      if (!DetectorCtor) {
        if (!cancelled) {
          setCameraStatus("unsupported");
          setErrorMessage(
            "Trình duyệt chưa hỗ trợ quét QR trực tiếp, bạn có thể tải ảnh QR hoặc nhập mã bàn."
          );
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (cancelled) return;

        setCameraStatus("active");
        setErrorMessage("");

        const detector = new DetectorCtor({ formats: ["qr_code"] });

        const scanLoop = async () => {
          if (
            cancelled ||
            scannedLockRef.current ||
            !videoRef.current ||
            videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
          ) {
            if (!cancelled) {
              rafRef.current = requestAnimationFrame(scanLoop);
            }
            return;
          }

          try {
            const barcodes = await detector.detect(videoRef.current);
            const firstQr = barcodes.find((item) => item.rawValue);
            if (firstQr?.rawValue) {
              handleDetected(firstQr.rawValue);
              return;
            }
          } catch {
            // Bỏ qua lỗi từng khung hình để tiếp tục quét
          }

          if (!cancelled) {
            rafRef.current = requestAnimationFrame(scanLoop);
          }
        };

        rafRef.current = requestAnimationFrame(scanLoop);
      } catch (err) {
        if (cancelled) return;
        const domError = err as DOMException | undefined;
        if (domError?.name === "NotAllowedError" || domError?.name === "PermissionDeniedError") {
          setCameraStatus("denied");
          setErrorMessage(
            "Bạn đã từ chối quyền camera. Hãy cấp quyền trong cài đặt trình duyệt hoặc nhập mã bàn."
          );
        } else {
          setCameraStatus("error");
          setErrorMessage("Không thể mở camera. Vui lòng thử lại hoặc nhập mã bàn thủ công.");
        }
      }
    };

    void runScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [facingMode, retryKey, handleDetected, stopScanner]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const DetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;
    if (!DetectorCtor) {
      setErrorMessage("Trình duyệt không hỗ trợ đọc mã QR từ ảnh, vui lòng nhập mã bàn.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const detector = new DetectorCtor({ formats: ["qr_code"] });
      const results = await detector.detect(bitmap);
      const found = results.find((r) => r.rawValue)?.rawValue;
      if (found) {
        handleDetected(found);
      } else {
        setErrorMessage("Không tìm thấy mã QR hợp lệ trong ảnh đã chọn.");
      }
    } catch {
      setErrorMessage("Không thể xử lý ảnh mã QR. Vui lòng chọn ảnh khác.");
    } finally {
      e.target.value = "";
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-[#141210] px-4 py-6 text-[#FAF8F5]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
            SmaRes • Gọi món tại bàn
          </p>
          <h1 className="text-lg font-bold">Quét mã QR tại bàn</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/15"
          >
            Đổi cam
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/15"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      <div className="my-5">
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${cameraStatus === "active" ? "block" : "hidden"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraStatus === "active" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/25">
              <div className="relative h-52 w-52 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              <p className="mt-4 rounded-full bg-black/70 px-3.5 py-1.5 text-xs text-stone-200">
                Đưa mã QR trên bàn vào khung vuông
              </p>
            </div>
          )}

          {cameraStatus !== "active" && (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-stone-200">
                {cameraStatus === "starting"
                  ? "Đang khởi động camera..."
                  : errorMessage || "Camera đang tắt"}
              </p>
              {cameraStatus !== "starting" && (
                <button
                  type="button"
                  onClick={() => setRetryKey((prev) => prev + 1)}
                  className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Thử mở lại camera
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleImageFileChange(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-white/10"
          >
            Tải ảnh mã QR từ thư viện
          </button>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label htmlFor="manual-table-code" className="block text-xs font-medium text-stone-300">
          Hoặc nhập mã bàn / liên kết QR thủ công
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="manual-table-code"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Ví dụ: B01, T02..."
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Vào bàn
          </button>
        </div>
      </form>
    </div>
  );
}