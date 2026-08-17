import type { ParsedChannel } from "./m3uParser";

const PLAYLIST_URL_KEY = "bonoplayer_playlist_url";
const PLAYLIST_CHANNELS_KEY = "bonoplayer_playlist_channels";

export function savePlaylistUrl(url: string) {
  localStorage.setItem(
    PLAYLIST_URL_KEY,
    url.trim()
  );
}

export function getPlaylistUrl() {
  return (
    localStorage.getItem(
      PLAYLIST_URL_KEY
    ) ?? ""
  );
}

export function savePlaylistChannels(
  channels: ParsedChannel[]
) {
  localStorage.setItem(
    PLAYLIST_CHANNELS_KEY,
    JSON.stringify(channels)
  );
}

export function getPlaylistChannels():
  ParsedChannel[] {
  const raw =
    localStorage.getItem(
      PLAYLIST_CHANNELS_KEY
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function clearPlaylist() {
  localStorage.removeItem(
    PLAYLIST_URL_KEY
  );

  localStorage.removeItem(
    PLAYLIST_CHANNELS_KEY
  );
}