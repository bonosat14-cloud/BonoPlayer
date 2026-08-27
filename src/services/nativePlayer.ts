import {
  registerPlugin,
} from "@capacitor/core";

type PreviewOptions = {
  streamUrl: string;

  x: number;
  y: number;

  width: number;
  height: number;

  scale?: number;
};

type FullscreenPlaybackOptions = {
  streamUrl: string;

  contentType?:
    | "movie"
    | "episode";

  contentId?: string;

  title?: string;

  seriesId?: string;

  seasonNumber?: number;

  episodeNumber?: number;
};

export type ResumeProgressOptions = {
  contentType:
    | "movie"
    | "episode";

  contentId: string;

  seriesId?: string;

  seasonNumber?: number;

  episodeNumber?: number;
};

export type ResumeProgress = {
  hasResume: boolean;

  position: number;

  duration: number;

  progress: number;
};

type NativePlayerPlugin = {
  play(options: {
    streamUrl: string;
  }): Promise<void>;

  playPreview(
    options: PreviewOptions
  ): Promise<void>;

  /*
   * Movies / Series
   */
  playFullscreen(
    options:
      FullscreenPlaybackOptions
  ): Promise<void>;

  /*
   * Resume / Continue Watching
   */
  getResumeProgress(
    options:
      ResumeProgressOptions
  ): Promise<ResumeProgress>;

  /*
   * Live TV
   *
   * نفس Preview Player
   * بدون إعادة تشغيل VLC.
   */
  enterLiveFullscreen():
    Promise<void>;

  exitLiveFullscreen():
    Promise<void>;

  stopPreview():
    Promise<void>;

  /*
   * YouTube Trailer
   *
   * مستقلة تمامًا عن VLC و Live TV.
   */
  openYouTube(options: {
    value: string;
  }): Promise<void>;

  exitApp():
    Promise<void>;
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
  await NativePlayer.playPreview(
    options
  );
}

/*
 * =========================================================
 * MOVIES / SERIES
 * =========================================================
 */

export async function playNativeFullscreen(
  options:
    | string
    | FullscreenPlaybackOptions
): Promise<void> {
  if (
    typeof options ===
    "string"
  ) {
    await NativePlayer.playFullscreen({
      streamUrl:
        options,
    });

    return;
  }

  await NativePlayer.playFullscreen(
    options
  );
}

/*
 * =========================================================
 * RESUME / CONTINUE WATCHING
 * =========================================================
 */

export async function getNativeResumeProgress(
  options:
    ResumeProgressOptions
): Promise<ResumeProgress> {
  return NativePlayer.getResumeProgress(
    options
  );
}

/*
 * =========================================================
 * LIVE TV
 * =========================================================
 */

export async function enterNativeLiveFullscreen():
Promise<void> {
  await NativePlayer
    .enterLiveFullscreen();
}

export async function exitNativeLiveFullscreen():
Promise<void> {
  await NativePlayer
    .exitLiveFullscreen();
}

export async function stopNativePreview():
Promise<void> {
  await NativePlayer.stopPreview();
}

/*
 * =========================================================
 * YOUTUBE TRAILER
 * =========================================================
 */

export async function openNativeYouTube(
  value: string
): Promise<void> {
  const trailerValue =
    value.trim();

  if (!trailerValue) {
    throw new Error(
      "YouTube trailer value is empty"
    );
  }

  await NativePlayer.openYouTube({
    value:
      trailerValue,
  });
}

/*
 * =========================================================
 * EXIT APP
 * =========================================================
 */

export async function exitNativeApp():
Promise<void> {
  await NativePlayer.exitApp();
}

