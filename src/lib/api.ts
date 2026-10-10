import { Capacitor } from '@capacitor/core';

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

/**
 * Resolve a backend endpoint for both browser and native Android builds.
 * In a browser, the API is same-origin by default. In a native build, relative
 * URLs point at the WebView itself, so an HTTPS backend URL must be configured.
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (configuredApiBaseUrl) {
    if (Capacitor.isNativePlatform()) {
      try {
        const parsed = new URL(configuredApiBaseUrl);
        if (parsed.protocol !== 'https:') {
          throw new Error('برای نسخه اندروید، آدرس بک‌اند باید با HTTPS شروع شود.');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('HTTPS')) throw error;
        throw new Error('آدرس VITE_API_BASE_URL معتبر نیست؛ یک آدرس کامل HTTPS وارد کنید.');
      }
    }
    return `${configuredApiBaseUrl}${normalizedPath}`;
  }

  if (Capacitor.isNativePlatform()) {
    throw new Error(
      'سرور هوش مصنوعی برای نسخه اندروید تنظیم نشده است. هنگام ساخت APK مقدار VITE_API_BASE_URL را به آدرس HTTPS بک‌اند خود تنظیم کنید.'
    );
  }

  return normalizedPath;
}
