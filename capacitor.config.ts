import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bonoplayer.tv",
  appName: "BonoPlayer",
  webDir: "dist",

  server: {
    androidScheme: "http",
  },
};

export default config;