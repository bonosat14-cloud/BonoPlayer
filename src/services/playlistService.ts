import { CapacitorHttp } from "@capacitor/core";

import {
  parseM3U,
  type ParsedChannel,
} from "./m3uParser";

export type PlaylistLoadResult = {
  channels: ParsedChannel[];
  loadedAt: number;
};

const PLAYLIST_TIMEOUT = 15_000;

export async function loadM3UPlaylist(
  playlistUrl: string
): Promise<PlaylistLoadResult> {
  const url = playlistUrl.trim();

  if (!url) {
    throw new Error("Playlist URL is empty.");
  }

  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://")
  ) {
    throw new Error(
      "Playlist URL must start with http:// or https://"
    );
  }

  try {
    const response = await CapacitorHttp.request({
      url,
      method: "GET",
      connectTimeout: PLAYLIST_TIMEOUT,
      readTimeout: PLAYLIST_TIMEOUT,
      headers: {
        Accept:
          "application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, */*",
      },
    });

    if (
      response.status < 200 ||
      response.status >= 300
    ) {
      throw new Error(
        `Playlist request failed: HTTP ${response.status}`
      );
    }

    let content = "";

    if (typeof response.data === "string") {
      content = response.data;
    } else {
      content = String(response.data ?? "");
    }

    content = content.replace(/^\uFEFF/, "");

    if (!content.includes("#EXTM3U")) {
      throw new Error(
        "The server response is not a valid M3U playlist."
      );
    }

    const channels = parseM3U(content);

    if (channels.length === 0) {
      throw new Error(
        "Playlist loaded, but no channels were found."
      );
    }

    console.log(
      `BONO Playlist loaded: ${channels.length} channels`
    );

    return {
      channels,
      loadedAt: Date.now(),
    };
  } catch (error) {
    console.error(
      "BONO Playlist load failed:",
      error
    );

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Unable to load playlist."
    );
  }
}