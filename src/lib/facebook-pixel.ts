
/**
 * Facebook Pixel Utility
 * Handles both Browser Pixel (fbq) and Conversions API (CAPI)
 */
import { trackFacebookEvent } from './facebook-pixel.functions';

const PIXEL_ID = "2122154438337409";

export const fbEvent = {
  /**
   * Initialize Facebook Pixel in the browser
   */
  init: () => {
    if (typeof window === 'undefined' || (window as any).fbq) return;

    (function(f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js', null, null, null);

    (window as any).fbq('init', PIXEL_ID);
    (window as any).fbq('track', 'PageView');
  },

  /**
   * Track a standard event
   */
  track: async (eventName: string, customData: any = {}) => {
    if (typeof window === 'undefined') return;

    // 1. Browser Pixel
    if ((window as any).fbq) {
      (window as any).fbq('track', eventName, {
        currency: 'USD',
        ...customData
      });
    }

    // 2. Conversions API (Server-side)
    try {
      await trackFacebookEvent({
        data: {
          eventName,
          eventSourceUrl: window.location.href,
          userData: {
            client_user_agent: navigator.userAgent,
          },
          customData: {
            currency: 'USD',
            ...customData
          }
        }
      });
    } catch (err) {
      console.warn('CAPI track failed', err);
    }
  }
};
