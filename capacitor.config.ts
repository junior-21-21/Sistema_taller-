import type { CapacitorConfig } from '@capacitor/cli';

// App Android (APK) con el mismo sistema de la web. Se arma con: npm run apk  (o abriendo /android en Android Studio).
const config: CapacitorConfig = {
  appId: 'pe.runrun.cotizador',
  appName: 'Run Run',
  webDir: 'dist/runrun-cotizador/browser',
  android: {
    // La hoja de Google responde por https; no hace falta permitir http.
    allowMixedContent: false,
  },
};

export default config;
