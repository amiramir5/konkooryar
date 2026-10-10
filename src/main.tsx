import { Capacitor } from '@capacitor/core';
import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Unhandled app error caught:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('ky_timer_state_v2');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6 text-right font-sans"
        >
          <div className="max-w-md w-full bg-white border border-blue-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              KY
            </div>
            <h1 className="text-xl font-black text-slate-900">
              کنکوریار ۲.۰ — بازیابی خودکار
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              اطلاعات و رکوردهای شما در حافظه دستگاه محفوظ است. برای راه‌اندازی تمیز و شروع مجدد روی دکمه زیر کلیک کنید.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                شروع مجدد برنامه
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

// Register service worker for installable PWA
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('PWA ServiceWorker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('PWA ServiceWorker registration failed:', err);
      });
  });
}

