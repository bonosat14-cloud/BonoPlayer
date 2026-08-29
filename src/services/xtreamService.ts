import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  API_BASE_URL,
} from "../config/api";

import type {
  ParsedChannel,
} from "./m3uParser";

/*
 * =========================================================
 * PLAYLISTS
 * =========================================================
 */

export type DevicePlaylist = {
  id: string;

  name: string;

  type:
    | "xtream"
    | "m3u";
};

type PlaylistsResponse = {
  ok: boolean;

  playlists?:
    DevicePlaylist[];

  message?: string;
};

type M3uChannelsResponse = {
  ok: boolean;

  playlistName?: string;

  channelCount?: number;

  channels?:
    ParsedChannel[];

  message?: string;
};

/*
 * =========================================================
 * CACHE
 * =========================================================
 */

const DB_NAME =
  "bonoplayer-live-cache-v3";

const DB_VERSION = 1;

const STORE_NAME =
  "live-channels";

const CACHE_MAX_AGE_MS =
  6 * 60 * 60 * 1000;

type XtreamCategory = {
  category_id: string;
  category_name: string;
};

type XtreamStream = {
  num: number;

  name: string;

  stream_type: string;

  stream_id: number;

  stream_icon: string;

  epg_channel_id:
    | string
    | null;

  category_id: string;

  category_ids?: number[];
};

type CategoriesResponse = {
  ok: boolean;

  categories?:
    XtreamCategory[];

  message?: string;
};

type StreamsResponse = {
  ok: boolean;

  streams?:
    XtreamStream[];

  message?: string;
};

type LiveChannelsCache = {
  cacheKey: string;

  deviceId: string;

  playlistId: string;

  updatedAt: number;

  channels:
    ParsedChannel[];
};

/*
 * =========================================================
 * INDEXED DB
 * =========================================================
 */

function makeCacheKey(
  deviceId: string,
  playlistId: string
): string {
  return (
    `${deviceId}:` +
    `${playlistId}`
  );
}

function openCacheDb():
Promise<IDBDatabase> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames
              .contains(
                STORE_NAME
              )
          ) {
            db.createObjectStore(
              STORE_NAME,
              {
                keyPath:
                  "cacheKey",
              }
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

async function getCachedLiveChannels(
  deviceId: string,
  playlistId: string
): Promise<
  LiveChannelsCache | null
> {
  const db =
    await openCacheDb();

  const cacheKey =
    makeCacheKey(
      deviceId,
      playlistId
    );

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(
          cacheKey
        );

      request.onsuccess =
        () => {
          resolve(
            (
              request.result as
                | LiveChannelsCache
                | undefined
            ) ?? null
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

async function saveCachedLiveChannels(
  cache:
    LiveChannelsCache
): Promise<void> {
  const db =
    await openCacheDb();

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.put(cache);

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error
          );
        };
    }
  );
}

/*
 * =========================================================
 * DEVICE PLAYLISTS
 * =========================================================
 */

export async function getDevicePlaylists(
  deviceId: string
): Promise<
  DevicePlaylist[]
> {
  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}` +
        `/api/device/${deviceId}` +
        `/playlists`,
    });

  const data =
    response.data as
      PlaylistsResponse;

  if (
    !data.ok ||
    !data.playlists
  ) {
    throw new Error(
      data.message ??
        "Unable to load playlists."
    );
  }

  return data.playlists;
}

/*
 * =========================================================
 * XTREAM - CATEGORIES
 * =========================================================
 */

export async function getLiveCategories(
  deviceId: string
): Promise<
  XtreamCategory[]
> {
  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}` +
        `/api/device/${deviceId}` +
        `/live/categories`,
    });

  const data =
    response.data as
      CategoriesResponse;

  if (
    !data.ok ||
    !data.categories
  ) {
    throw new Error(
      data.message ??
        "Unable to load live categories."
    );
  }

  return data.categories;
}

/*
 * =========================================================
 * XTREAM - CHANNELS
 * =========================================================
 */

async function fetchXtreamChannels(
  deviceId: string
): Promise<
  ParsedChannel[]
> {
  const [
    categories,
    response,
  ] =
    await Promise.all([
      getLiveCategories(
        deviceId
      ),

      CapacitorHttp.get({
        url:
          `${API_BASE_URL}` +
          `/api/device/${deviceId}` +
          `/live/streams`,
      }),
    ]);

  const data =
    response.data as
      StreamsResponse;

  if (
    !data.ok ||
    !data.streams
  ) {
    throw new Error(
      data.message ??
        "Unable to load live channels."
    );
  }

  const categoryMap =
    new Map(
      categories.map(
        (category) => [
          category.category_id,
          category.category_name,
        ]
      )
    );

  return data.streams.map(
    (stream) => {
      const epgId =
        stream.epg_channel_id
          ?.trim() ||
        undefined;

      return {
        id:
          String(
            stream.stream_id
          ),

        name:
          stream.name,

        category:
          categoryMap.get(
            stream.category_id
          ) ?? "Other",

        logo:
          stream.stream_icon ||
          "",

        streamUrl:
          `${API_BASE_URL}` +
          `/api/device/${deviceId}` +
          `/live/play/` +
          `${stream.stream_id}`,

        epgId,
      };
    }
  );
}

/*
 * =========================================================
 * M3U - CHANNELS
 * =========================================================
 */

async function fetchM3uChannels(
  deviceId: string,
  playlistId: string
): Promise<
  ParsedChannel[]
> {
  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}` +
        `/api/device/${deviceId}` +
        `/m3u/live` +
        `?playlistId=${encodeURIComponent(
          playlistId
        )}`,
    });

  const data =
    response.data as
      M3uChannelsResponse;

  if (
    !data.ok ||
    !data.channels
  ) {
    throw new Error(
      data.message ??
        "Unable to load M3U channels."
    );
  }

  return data.channels.map(
    (channel) => ({
      ...channel,

      streamUrl:
        channel.streamUrl
          .startsWith(
            "http://"
          ) ||
        channel.streamUrl
          .startsWith(
            "https://"
          )
          ? channel.streamUrl
          : `${API_BASE_URL}${channel.streamUrl}`,
    })
  );
}

/*
 * =========================================================
 * NETWORK DISPATCHER
 * =========================================================
 */

async function fetchLiveChannelsFromNetwork(
  deviceId: string,
  playlist:
    DevicePlaylist
): Promise<
  ParsedChannel[]
> {
  if (
    playlist.type ===
    "m3u"
  ) {
    console.log(
      `BONO loading M3U playlist: ${playlist.name}`
    );

    return fetchM3uChannels(
      deviceId,
      playlist.id
    );
  }

  console.log(
    `BONO loading Xtream playlist: ${playlist.name}`
  );

  return fetchXtreamChannels(
    deviceId
  );
}

/*
 * =========================================================
 * PUBLIC API
 * CACHE FIRST
 * =========================================================
 */

export async function getLiveChannels(
  deviceId: string,
  playlist?:
    DevicePlaylist
): Promise<
  ParsedChannel[]
> {
  /*
   * Backward compatibility:
   *
   * LiveTV القديم كان يستعمل:
   * getLiveChannels("326498")
   *
   * لذلك إذا لم تصل Playlist نختار
   * Xtream أولًا تلقائيًا.
   */
  let selectedPlaylist =
    playlist;

  if (!selectedPlaylist) {
    const playlists =
      await getDevicePlaylists(
        deviceId
      );

    selectedPlaylist =
      playlists.find(
        (item) =>
          item.type ===
          "xtream"
      ) ??
      playlists[0];
  }

  if (!selectedPlaylist) {
    throw new Error(
      "No playlist found for this device."
    );
  }

  const cacheKey =
    makeCacheKey(
      deviceId,
      selectedPlaylist.id
    );

  let cached:
    | LiveChannelsCache
    | null = null;

  try {
    cached =
      await getCachedLiveChannels(
        deviceId,
        selectedPlaylist.id
      );
  } catch (error) {
    console.warn(
      "BONO cache read failed:",
      error
    );
  }

  /*
   * FRESH CACHE
   */
  if (
    cached?.channels.length
  ) {
    const age =
      Date.now() -
      cached.updatedAt;

    if (
      age <
      CACHE_MAX_AGE_MS
    ) {
      console.log(
        `BONO cache hit [${selectedPlaylist.name}]: ${cached.channels.length} channels`
      );

      return cached.channels;
    }

    /*
     * STALE CACHE
     */
    console.log(
      `BONO stale cache [${selectedPlaylist.name}], refreshing...`
    );

    void fetchLiveChannelsFromNetwork(
      deviceId,
      selectedPlaylist
    )
      .then(
        async (
          channels
        ) => {
          await saveCachedLiveChannels(
            {
              cacheKey,

              deviceId,

              playlistId:
                selectedPlaylist.id,

              updatedAt:
                Date.now(),

              channels,
            }
          );

          console.log(
            `BONO cache refreshed [${selectedPlaylist.name}]: ${channels.length} channels`
          );
        }
      )
      .catch(
        (error) => {
          console.error(
            `BONO background refresh failed [${selectedPlaylist.name}]:`,
            error
          );
        }
      );

    return cached.channels;
  }

  /*
   * CACHE MISS
   */
  console.log(
    `BONO cache miss [${selectedPlaylist.name}], loading network...`
  );

  const channels =
    await fetchLiveChannelsFromNetwork(
      deviceId,
      selectedPlaylist
    );

  try {
    await saveCachedLiveChannels(
      {
        cacheKey,

        deviceId,

        playlistId:
          selectedPlaylist.id,

        updatedAt:
          Date.now(),

        channels,
      }
    );

    console.log(
      `BONO cache saved [${selectedPlaylist.name}]: ${channels.length} channels`
    );
  } catch (error) {
    console.warn(
      "BONO cache save failed:",
      error
    );
  }

  return channels;
}