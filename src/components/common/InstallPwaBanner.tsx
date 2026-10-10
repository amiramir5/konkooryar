import { Capacitor } from '@capacitor/core';
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // A native Capacitor APK is already installed as a real Android app.
    if (Capacitor.isNativePlatform()) {
      setIsInstalled(true);
      return;
    }

    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If prompt isn't directly available (iOS or Chrome in certain conditions), open step-by-step guide
      setShowGuide(true);
    }
  };

  if (Capacitor.isNativePlatform() || isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-2.5 sm:py-3 shadow-lg flex items-center justify-between text-xs sm:text-sm font-medium relative z-40 border-b border-blue-500/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-white block">
              نصب نسخه اپلیکیشن (PWA) روی گوشی
            </span>
            <span className="text-[11px] text-blue-100 hidden sm:inline">
              اجرای تمام‌صفحه، آیکون مستقل برنامه و دسترسی سریع بدون باز ماندن تب مرورگر
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-blue-800 font-black text-xs hover:bg-blue-50 active:scale-95 transition-all shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>نصب اپلیکیشن</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide Modal when direct prompt is not automatically triggered */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
                  راهنمای نصب وب‌اپلیکیشن در مرورگر
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    برای گوشی‌های آیفون (iOS Safari):
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pr-1">
                    <li className="flex items-start gap-2">
                      <Share2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>روی دکمه Share (اشتراک‌گذاری) در پایین مرورگر بزنید.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <PlusSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>گزینه «Add to Home Screen» (افزودن به صفحه اصلی) را انتخاب کنید.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>برنامه مانند یک اپ اختصاصی و تمام‌صفحه نصب خواهد شد.</span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    برای مرورگر کروم در گوشی‌های اندروید (Chrome Android):
                  </p>
                  <ol className="space-y-2 pr-1">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-bold flex items-center justify-center shrink-0">۱</span>
                      <span>روی منوی سه‌نقطه بالای سمت راست کروم (⋮) ضربه بزنید.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-bold flex items-center justify-center shrink-0">۲</span>
                      <span>روی گزینه <strong>«نصب برنامه» یا «Install App»</strong> (نه فقط افزودن به صفحه اصلی) ضربه بزنید.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-bold flex items-center justify-center shrink-0">۳</span>
                      <span>تایید را بزنید تا برنامه در لیست اپلیکیشن‌های گوشی شما ثبت شود.</span>
                    </li>
                  </ol>
                </>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
