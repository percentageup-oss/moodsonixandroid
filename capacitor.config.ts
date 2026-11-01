import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moodsonix.app',
  appName: 'Moodsonix',
  webDir: 'dist',
  plugins: {
    MediaSession: {
      foregroundService: 'always'
    }
  }
};

export default config;
