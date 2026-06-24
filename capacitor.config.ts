import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musyfy.app',
  appName: 'Musyfy',
  webDir: 'public',

  server: {
    url: 'https://musy-fi.onrender.com',
    cleartext: true
  }
};

export default config;