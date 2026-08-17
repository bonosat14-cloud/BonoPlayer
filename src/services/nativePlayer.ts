import { registerPlugin } from "@capacitor/core";

type PreviewOptions = {
  streamUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
};

type NativePlayerPlugin = {
  play(options: {
    streamUrl: string;
  }): Promise<void>;

  playPreview(
    options: PreviewOptions
  ): Promise<void>;

  playFullscreen(options: {
    streamUrl: string;
  }): Promise<void>;

  stopPreview(): Promise<void>;

  exitApp(): Promise<void>;
};

const NativePlayer =
  registerPlugin<NativePlayerPlugin>(
    "NativePlayer"
  );

export async function playNative(
  streamUrl: string
): Promise<void> {
  await NativePlayer.play({
    streamUrl,
  });
}

export async function playNativePreview(
  options: PreviewOptions
): Promise<void> {
  await NativePlayer.playPreview(options);
}

export async function playNativeFullscreen(
  streamUrl: string
): Promise<void> {
  await NativePlayer.playFullscreen({
    streamUrl,
  });
}

export async function stopNativePreview(): Promise<void> {
  await NativePlayer.stopPreview();
}

export async function exitNativeApp(): Promise<void> {
  await NativePlayer.exitApp();
}