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
 * نستخدم Cache جديدًا حتى لا نرجع
 * إلى القنوات القديمة التي لا تحتوي epgId.
 */
const DB_NAME =
  "bonoplayer-live-cache-v2";

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
  deviceId: string;

  updatedAt: number;

  channels:
    ParsedChannel[];
};

/*
 * =========================================================
 * INDEXED DB
 * =========================================================
 */

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
                  "deviceId",
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
  deviceId: string
): Promise<
  LiveChannelsCache | null
> {
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
          "readonly"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(
          deviceId
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
  cache: LiveChannelsCache
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
 * NETWORK - CATEGORIES
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
 * NETWORK - CHANNELS
 * =========================================================
 */

async function fetchLiveChannelsFromNetwork(
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
        /*
         * stream_id يبقى ID التشغيل.
         */
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

        /*
         * هذا هو مفتاح XMLTV الحقيقي.
         */
        epgId,
      };
    }
  );
}

/*
 * =========================================================
 * PUBLIC API
 * CACHE FIRST
 * =========================================================
 */

export async function getLiveChannels(
  deviceId: string
): Promise<
  ParsedChannel[]
> {
  let cached:
    | LiveChannelsCache
    | null = null;

  try {
    cached =
      await getCachedLiveChannels(
        deviceId
      );
  } catch (error) {
    console.warn(
      "BONO cache read failed:",
      error
    );
  }

  /*
   * CACHE EXISTS
   */
  if (
    cached?.channels.length
  ) {
    const age =
      Date.now() -
      cached.updatedAt;

    /*
     * FRESH CACHE
     */
    if (
      age <
      CACHE_MAX_AGE_MS
    ) {
      console.log(
        `BONO cache hit: ${cached.channels.length} channels`
      );

      return cached.channels;
    }

    /*
     * STALE CACHE
     */
    console.log(
      "BONO stale cache returned, refreshing..."
    );

    void fetchLiveChannelsFromNetwork(
      deviceId
    )
      .then(
        async (
          channels
        ) => {
          await saveCachedLiveChannels(
            {
              deviceId,

              updatedAt:
                Date.now(),

              channels,
            }
          );

          console.log(
            `BONO cache refreshed: ${channels.length} channels`
          );
        }
      )
      .catch(
        (error) => {
          console.error(
            "BONO background refresh failed:",
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
    "BONO cache miss, loading network..."
  );

  const channels =
    await fetchLiveChannelsFromNetwork(
      deviceId
    );

  try {
    await saveCachedLiveChannels(
      {
        deviceId,

        updatedAt:
          Date.now(),

        channels,
      }
    );

    console.log(
      `BONO cache saved: ${channels.length} channels`
    );
  } catch (error) {
    console.warn(
      "BONO cache save failed:",
      error
    );
  }

  return channels;
}