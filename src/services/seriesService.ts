import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  API_BASE_URL,
} from "../config/api";

const DB_NAME =
  "bonoplayer-series-cache";

const DB_VERSION = 1;

const SERIES_STORE_NAME =
  "series";

const SERIES_CATEGORIES_STORE_NAME =
  "series-categories";

const CACHE_MAX_AGE_MS =
  6 * 60 * 60 * 1000;

/*
 * =========================================================
 * PUBLIC TYPES
 * =========================================================
 */

export type SeriesCategory = {
  category_id: string;
  category_name: string;
};

export type SeriesItem = {
  id: string;

  title: string;

  categoryId: string;

  category: string;

  poster: string;

  backdrop: string;

  rating: string;

  year: string;

  plot: string;
};

export type SeriesEpisode = {
  id: string;

  episodeNumber: number;

  title: string;

  extension: string;

  seasonNumber: number;

  streamUrl: string;

  duration: string;

  plot: string;

  poster: string;
};

export type SeriesSeason = {
  seasonNumber: number;

  name: string;

  poster: string;

  episodes: SeriesEpisode[];
};

export type SeriesInfo = {
  id: string;

  title: string;

  plot: string;

  cast: string;

  director: string;

  genre: string;

  releaseDate: string;

  year: string;

  rating: string;

  poster: string;

  backdrop: string;

  youtubeTrailer: string;

  seasons: SeriesSeason[];
};

/*
 * =========================================================
 * XTREAM TYPES
 * =========================================================
 */

type XtreamSeries = {
  num?: number;

  name?: string;

  series_id:
    | number
    | string;

  cover?: string;

  plot?: string;

  cast?: string;

  director?: string;

  genre?: string;

  releaseDate?: string;

  release_date?: string;

  rating?: string | number;

  rating_5based?:
    | string
    | number;

  backdrop_path?:
    | string[]
    | string;

  youtube_trailer?: string;

  category_id?: string;

  last_modified?: string;
};

type XtreamSeriesInfoData = {
  name?: string;

  title?: string;

  cover?: string;

  movie_image?: string;

  plot?: string;

  description?: string;

  cast?: string;

  actors?: string;

  director?: string;

  genre?: string;

  releaseDate?: string;

  release_date?: string;

  releasedate?: string;

  year?: string | number;

  rating?: string | number;

  rating_5based?:
    | string
    | number;

  backdrop_path?:
    | string[]
    | string;

  youtube_trailer?: string;
};

type XtreamSeason = {
  air_date?: string;

  episode_count?: number;

  id?: number;

  name?: string;

  overview?: string;

  season_number?:
    | number
    | string;

  cover?: string;

  cover_big?: string;
};

type XtreamEpisodeInfo = {
  movie_image?: string;

  cover_big?: string;

  plot?: string;

  description?: string;

  duration?: string;

  duration_secs?: number;

  rating?: string | number;

  releaseDate?: string;
};

type XtreamEpisode = {
  id:
    | string
    | number;

  episode_num?:
    | number
    | string;

  title?: string;

  container_extension?: string;

  info?: XtreamEpisodeInfo;

  season?:
    | number
    | string;
};

type XtreamSeriesInfoResponseData = {
  info?: XtreamSeriesInfoData;

  seasons?: XtreamSeason[];

  episodes?: Record<
    string,
    XtreamEpisode[]
  >;
};

/*
 * =========================================================
 * BACKEND RESPONSE TYPES
 * =========================================================
 */

type CategoriesResponse = {
  ok: boolean;

  categories?: SeriesCategory[];

  message?: string;
};

type SeriesResponse = {
  ok: boolean;

  series?: XtreamSeries[];

  message?: string;
};

type SeriesInfoResponse = {
  ok: boolean;

  info?: XtreamSeriesInfoResponseData;

  message?: string;
};

/*
 * =========================================================
 * CACHE TYPES
 * =========================================================
 */

type CategoriesCache = {
  deviceId: string;

  updatedAt: number;

  categories: SeriesCategory[];
};

type SeriesCache = {
  deviceId: string;

  updatedAt: number;

  series: SeriesItem[];
};

/*
 * =========================================================
 * INDEXED DB
 * =========================================================
 */

function openSeriesDb(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
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
            !db.objectStoreNames.contains(
              SERIES_STORE_NAME
            )
          ) {
            db.createObjectStore(
              SERIES_STORE_NAME,
              {
                keyPath:
                  "deviceId",
              }
            );
          }

          if (
            !db.objectStoreNames.contains(
              SERIES_CATEGORIES_STORE_NAME
            )
          ) {
            db.createObjectStore(
              SERIES_CATEGORIES_STORE_NAME,
              {
                keyPath:
                  "deviceId",
              }
            );
          }
        };

      request.onsuccess = () => {
        resolve(
          request.result
        );
      };

      request.onerror = () => {
        reject(
          request.error
        );
      };
    }
  );
}

/*
 * =========================================================
 * CATEGORY CACHE
 * =========================================================
 */

async function getCachedCategories(
  deviceId: string
): Promise<CategoriesCache | null> {
  const db =
    await openSeriesDb();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          SERIES_CATEGORIES_STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          SERIES_CATEGORIES_STORE_NAME
        );

      const request =
        store.get(deviceId);

      request.onsuccess = () => {
        resolve(
          (
            request.result as
              | CategoriesCache
              | undefined
          ) ?? null
        );
      };

      request.onerror = () => {
        reject(
          request.error
        );
      };
    }
  );
}

async function saveCategoriesCache(
  cache: CategoriesCache
): Promise<void> {
  const db =
    await openSeriesDb();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          SERIES_CATEGORIES_STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          SERIES_CATEGORIES_STORE_NAME
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
 * SERIES CACHE
 * =========================================================
 */

async function getCachedSeries(
  deviceId: string
): Promise<SeriesCache | null> {
  const db =
    await openSeriesDb();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          SERIES_STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          SERIES_STORE_NAME
        );

      const request =
        store.get(deviceId);

      request.onsuccess = () => {
        resolve(
          (
            request.result as
              | SeriesCache
              | undefined
          ) ?? null
        );
      };

      request.onerror = () => {
        reject(
          request.error
        );
      };
    }
  );
}

async function saveSeriesCache(
  cache: SeriesCache
): Promise<void> {
  const db =
    await openSeriesDb();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          SERIES_STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          SERIES_STORE_NAME
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
 * HELPERS
 * =========================================================
 */

function valueToString(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function valueToNumber(
  value: unknown,
  fallback = 0
): number {
  const result =
    Number(value);

  if (
    Number.isNaN(result)
  ) {
    return fallback;
  }

  return result;
}

function getBackdrop(
  value:
    | string[]
    | string
    | undefined
): string {
  if (
    Array.isArray(value)
  ) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function extractYear(
  yearValue: unknown,
  releaseDate: string
): string {
  const directYear =
    valueToString(
      yearValue
    );

  if (directYear) {
    return directYear;
  }

  if (!releaseDate) {
    return "";
  }

  const match =
    releaseDate.match(
      /\b(19|20)\d{2}\b/
    );

  return match?.[0] ?? "";
}

/*
 * =========================================================
 * NETWORK - CATEGORIES
 * =========================================================
 */

async function fetchSeriesCategories(
  deviceId: string
): Promise<SeriesCategory[]> {
  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}/api/device/${deviceId}` +
        `/series/categories`,
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
        "Unable to load series categories."
    );
  }

  return data.categories;
}

/*
 * =========================================================
 * NETWORK - SERIES
 * =========================================================
 */

async function fetchSeriesFromNetwork(
  deviceId: string
): Promise<SeriesItem[]> {
  const [
    categories,
    response,
  ] = await Promise.all([
    fetchSeriesCategories(
      deviceId
    ),

    CapacitorHttp.get({
      url:
        `${API_BASE_URL}/api/device/${deviceId}` +
        `/series`,
    }),
  ]);

  const data =
    response.data as
      SeriesResponse;

  if (
    !data.ok ||
    !data.series
  ) {
    throw new Error(
      data.message ??
        "Unable to load series."
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

  return data.series.map(
    (item) => {
      const categoryId =
        valueToString(
          item.category_id
        );

      const releaseDate =
        item.releaseDate ||
        item.release_date ||
        "";

      return {
        id:
          valueToString(
            item.series_id
          ),

        title:
          item.name || "",

        categoryId,

        category:
          categoryMap.get(
            categoryId
          ) ?? "Other",

        poster:
          item.cover || "",

        backdrop:
          getBackdrop(
            item.backdrop_path
          ),

        rating:
          valueToString(
            item.rating ??
              item.rating_5based
          ),

        year:
          extractYear(
            undefined,
            releaseDate
          ),

        plot:
          item.plot || "",
      };
    }
  );
}

/*
 * =========================================================
 * PUBLIC API - CATEGORIES
 * =========================================================
 */

export async function getSeriesCategories(
  deviceId: string
): Promise<SeriesCategory[]> {
  let cached:
    | CategoriesCache
    | null = null;

  try {
    cached =
      await getCachedCategories(
        deviceId
      );
  } catch (error) {
    console.warn(
      "BONO series categories cache read failed:",
      error
    );
  }

  if (
    cached?.categories.length
  ) {
    const age =
      Date.now() -
      cached.updatedAt;

    if (
      age <
      CACHE_MAX_AGE_MS
    ) {
      return cached.categories;
    }

    void fetchSeriesCategories(
      deviceId
    )
      .then(
        async (
          categories
        ) => {
          await saveCategoriesCache(
            {
              deviceId,

              updatedAt:
                Date.now(),

              categories,
            }
          );
        }
      )
      .catch((error) => {
        console.error(
          "BONO series categories refresh failed:",
          error
        );
      });

    return cached.categories;
  }

  const categories =
    await fetchSeriesCategories(
      deviceId
    );

  try {
    await saveCategoriesCache(
      {
        deviceId,

        updatedAt:
          Date.now(),

        categories,
      }
    );
  } catch (error) {
    console.warn(
      "BONO series categories cache save failed:",
      error
    );
  }

  return categories;
}

/*
 * =========================================================
 * PUBLIC API - SERIES
 * =========================================================
 */

export async function getSeries(
  deviceId: string
): Promise<SeriesItem[]> {
  let cached:
    | SeriesCache
    | null = null;

  try {
    cached =
      await getCachedSeries(
        deviceId
      );
  } catch (error) {
    console.warn(
      "BONO series cache read failed:",
      error
    );
  }

  if (
    cached?.series.length
  ) {
    const age =
      Date.now() -
      cached.updatedAt;

    if (
      age <
      CACHE_MAX_AGE_MS
    ) {
      console.log(
        `BONO series cache hit: ${cached.series.length} series`
      );

      return cached.series;
    }

    console.log(
      "BONO series stale cache returned, refreshing..."
    );

    void fetchSeriesFromNetwork(
      deviceId
    )
      .then(
        async (
          series
        ) => {
          await saveSeriesCache(
            {
              deviceId,

              updatedAt:
                Date.now(),

              series,
            }
          );

          console.log(
            `BONO series cache refreshed: ${series.length} series`
          );
        }
      )
      .catch((error) => {
        console.error(
          "BONO series background refresh failed:",
          error
        );
      });

    return cached.series;
  }

  console.log(
    "BONO series cache miss, loading network..."
  );

  const series =
    await fetchSeriesFromNetwork(
      deviceId
    );

  try {
    await saveSeriesCache(
      {
        deviceId,

        updatedAt:
          Date.now(),

        series,
      }
    );

    console.log(
      `BONO series cache saved: ${series.length} series`
    );
  } catch (error) {
    console.warn(
      "BONO series cache save failed:",
      error
    );
  }

  return series;
}

/*
 * =========================================================
 * PUBLIC API - SERIES INFO
 * =========================================================
 */

export async function getSeriesInfo(
  deviceId: string,
  seriesId: string
): Promise<SeriesInfo> {
  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}/api/device/${deviceId}` +
        `/series/info/${seriesId}`,
    });

  const data =
    response.data as
      SeriesInfoResponse;

  if (
    !data.ok ||
    !data.info
  ) {
    throw new Error(
      data.message ??
        "Unable to load series information."
    );
  }

  const raw =
    data.info;

  const info =
    raw.info ?? {};

  const releaseDate =
    info.releaseDate ||
    info.release_date ||
    info.releasedate ||
    "";

  const poster =
    info.cover ||
    info.movie_image ||
    "";

  const backdrop =
    getBackdrop(
      info.backdrop_path
    );

  /*
   * =======================================================
   * EPISODES -> SEASONS
   * =======================================================
   */

  const episodesBySeason =
    raw.episodes ?? {};

  const seasonMetadata =
    new Map<
      number,
      XtreamSeason
    >();

  for (
    const season of
    raw.seasons ?? []
  ) {
    const seasonNumber =
      valueToNumber(
        season.season_number,
        -1
      );

    if (
      seasonNumber >= 0
    ) {
      seasonMetadata.set(
        seasonNumber,
        season
      );
    }
  }

  const seasons: SeriesSeason[] =
    Object.entries(
      episodesBySeason
    )
      .map(
        ([
          seasonKey,
          rawEpisodes,
        ]) => {
          const seasonNumber =
            valueToNumber(
              seasonKey,
              0
            );

          const metadata =
            seasonMetadata.get(
              seasonNumber
            );

          const episodes =
            rawEpisodes.map(
              (
                episode,
                index
              ): SeriesEpisode => {
                const extension =
                  episode.container_extension ||
                  "mp4";

                const episodeNumber =
                  valueToNumber(
                    episode.episode_num,
                    index + 1
                  );

                const episodeId =
                  valueToString(
                    episode.id
                  );

                const episodeInfo =
                  episode.info ?? {};

                return {
                  id:
                    episodeId,

                  episodeNumber,

                  title:
                    episode.title ||
                    `Episode ${episodeNumber}`,

                  extension,

                  seasonNumber,

                  streamUrl:
                    `${API_BASE_URL}/api/device/${deviceId}` +
                    `/series/play/${episodeId}/${extension}`,

                  duration:
                    episodeInfo.duration ||
                    "",

                  plot:
                    episodeInfo.plot ||
                    episodeInfo.description ||
                    "",

                  poster:
                    episodeInfo.movie_image ||
                    episodeInfo.cover_big ||
                    poster,
                };
              }
            );

          episodes.sort(
            (a, b) =>
              a.episodeNumber -
              b.episodeNumber
          );

          return {
            seasonNumber,

            name:
              metadata?.name ||
              `Season ${seasonNumber}`,

            poster:
              metadata?.cover ||
              metadata?.cover_big ||
              poster,

            episodes,
          };
        }
      );

  seasons.sort(
    (a, b) =>
      a.seasonNumber -
      b.seasonNumber
  );

  const seriesInfo: SeriesInfo = {
    id:
      seriesId,

    title:
      info.name ||
      info.title ||
      "",

    plot:
      info.plot ||
      info.description ||
      "",

    cast:
      info.cast ||
      info.actors ||
      "",

    director:
      info.director ||
      "",

    genre:
      info.genre ||
      "",

    releaseDate,

    year:
      extractYear(
        info.year,
        releaseDate
      ),

    rating:
      valueToString(
        info.rating ??
          info.rating_5based
      ),

    poster,

    backdrop,

    youtubeTrailer:
      info.youtube_trailer ||
      "",

    seasons,
  };

  console.log(
    "BONO Series info loaded:",
    seriesInfo.title,
    `${seriesInfo.seasons.length} seasons`
  );

  return seriesInfo;
}