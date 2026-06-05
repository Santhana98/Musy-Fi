import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musyfy.app',
  appName: 'Musyfy',
  webDir: 'public',
  server: {
    // This points the mobile app to your 24/7 free cloud server on Render
    url: 'https://musy-fi.onrender.com',
    cleartext: true
  }
};

export default config;
