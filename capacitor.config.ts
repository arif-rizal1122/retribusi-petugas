import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.mpad.petugas',
  appName: 'Retribusi Petugas Bau-Bau',
  webDir: 'dist',
  server: {
    url: 'https://petugasmpad.baubaukota.go.id',
    cleartext: true
  }
};

export default config;
