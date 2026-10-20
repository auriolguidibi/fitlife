import type { CapacitorConfig } from '@capacitor/cli'

/** Application Android (APK) : l'interface web construite dans dist/, dans une coque native. */
const config: CapacitorConfig = {
  appId: 'com.fitlife.app',
  appName: 'FitLife',
  webDir: 'dist',
  backgroundColor: '#000503',
  android: {
    // Les photos Unsplash et le serveur sont en https : pas de contenu mixte.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
