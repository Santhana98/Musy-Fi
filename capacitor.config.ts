import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musyfy.app',
  appName: 'Musyfy',
  webDir: 'public',

  server: {
    url: 'http://192.168.29.50:3000',
    cleartext: true
  }
};

export default config;