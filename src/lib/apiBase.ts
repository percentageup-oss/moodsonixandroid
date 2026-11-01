import { Capacitor } from '@capacitor/core';

export const API_BASE = Capacitor.isNativePlatform()
  ? 'https://moodsononix-web.vercel.app'
  : '';
