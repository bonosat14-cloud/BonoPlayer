import { CapacitorHttp } from "@capacitor/core";

const API_BASE_URL = "http://192.168.1.6:4000";

const DB_NAME = "bonoplayer-movies-cache";
const DB_VERSION = 1;

const MOVIES_STORE_NAME = "movies";
const MOVIE_CATEGORIES_STORE_NAME =
  "movie-categories";

const CACHE_MAX_AGE_MS =
  6 * 60 * 60 * 1000;

export type MovieCategory = {
  category_id: string;
  category_name: string;
};

export type MovieItem = {
  id: string;
  title: string;
  categoryId: string;
  category: string;
  poster: string;
  extension: string;
  rating?: string;
  year?: string;
  streamUrl: string;
};

type XtreamVodStream = {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number;
  stream_icon?: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension?: string;
  custom_sid?: string | null;
  direct_source?: string;
};

type CategoriesResponse = {
  ok: boolean;
  categories?: MovieCategory[];
  message?: string;
};

type StreamsResponse = {
  ok: boolean;
  streams?: XtreamVodStream[];
  message?: string;
};

type CategoriesCache = {
  deviceId: string;
  updatedAt: number;
  categories: MovieCategory[];
};

type MoviesCache = {
  deviceId: string;
  updatedAt: number;
  movies: MovieItem[];
};

/*
 * =========================================================
 * INDEXED DB
 * =========================================================
 */

function openMoviesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          MOVIES_STORE_NAME
        )
      ) {
        db.createObjectStore(
          MOVIES_STORE_NAME,
          {
            keyPath: "deviceId",
          }
        );
      }

      if (
        !db.objectStoreNames.contains(
          MOVIE_CATEGORIES_STORE_NAME
        )
      ) {
        db.createObjectStore(
          MOVIE_CATEGORIES_STORE_NAME,
          {
            keyPath: "deviceId",
          }
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function getCachedCategories(
  deviceId: string
): Promise<CategoriesCache | null> {
  const db = await openMoviesDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MOVIE_CATEGORIES_STORE_NAME,
      "readonly"
    );

    const store =
      transaction.objectStore(
        MOVIE_CATEGORIES_STORE_NAME
      );

    const request = store.get(deviceId);

    request.onsuccess = () => {
      resolve(
        (request.result as
          CategoriesCache | undefined) ??
          null
      );
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveCategoriesCache(
  cache: CategoriesCache
): Promise<void> {
  const db = await openMoviesDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MOVIE_CATEGORIES_STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        MOVIE_CATEGORIES_STORE_NAME
      );

    store.put(cache);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function getCachedMovies(
  deviceId: string
): Promise<MoviesCache | null> {
  const db = await openMoviesDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MOVIES_STORE_NAME,
      "readonly"
    );

    const store =
      transaction.objectStore(
        MOVIES_STORE_NAME
      );

    const request = store.get(deviceId);

    request.onsuccess = () => {
      resolve(
        (request.result as
          MoviesCache | undefined) ??
          null
      );
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveMoviesCache(
  cache: MoviesCache
): Promise<void> {
  const db = await openMoviesDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MOVIES_STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        MOVIES_STORE_NAME
      );

    store.put(cache);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/*
 * =========================================================
 * NETWORK
 * =========================================================
 */

async function fetchMovieCategories(
  deviceId: string
): Promise<MovieCategory[]> {
  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}/api/device/${deviceId}` +
        `/vod/categories`,
    });

  const data =
    response.data as CategoriesResponse;

  if (
    !data.ok ||
    !data.categories
  ) {
    throw new Error(
      data.message ??
        "Unable to load movie categories."
    );
  }

  return data.categories;
}

async function fetchMoviesFromNetwork(
  deviceId: string
): Promise<MovieItem[]> {
  const [categories, response] =
    await Promise.all([
      fetchMovieCategories(deviceId),

      CapacitorHttp.get({
        url:
          `${API_BASE_URL}/api/device/${deviceId}` +
          `/vod/streams`,
      }),
    ]);

  const data =
    response.data as StreamsResponse;

  if (
    !data.ok ||
    !data.streams
  ) {
    throw new Error(
      data.message ??
        "Unable to load movies."
    );
  }

  const categoryMap =
    new Map(
      categories.map((category) => [
        category.category_id,
        category.category_name,
      ])
    );

  return data.streams.map(
    (stream) => {
      const extension =
        stream.container_extension ||
        "mp4";

      return {
        id: String(stream.stream_id),

        title: stream.name,

        categoryId:
          stream.category_id,

        category:
          categoryMap.get(
            stream.category_id
          ) ?? "Other",

        poster:
          stream.stream_icon || "",

        extension,

        rating:
          stream.rating ?? "",

        year: "",

        streamUrl:
          `${API_BASE_URL}/api/device/${deviceId}` +
          `/vod/play/${stream.stream_id}/${extension}`,
      };
    }
  );
}

/*
 * =========================================================
 * PUBLIC API
 * =========================================================
 */

export async function getMovieCategories(
  deviceId: string
): Promise<MovieCategory[]> {
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
      "BONO movie categories cache read failed:",
      error
    );
  }

  if (cached?.categories.length) {
    const age =
      Date.now() -
      cached.updatedAt;

    if (age < CACHE_MAX_AGE_MS) {
      return cached.categories;
    }

    void fetchMovieCategories(deviceId)
      .then(async (categories) => {
        await saveCategoriesCache({
          deviceId,
          updatedAt: Date.now(),
          categories,
        });
      })
      .catch((error) => {
        console.error(
          "BONO movie categories refresh failed:",
          error
        );
      });

    return cached.categories;
  }

  const categories =
    await fetchMovieCategories(
      deviceId
    );

  try {
    await saveCategoriesCache({
      deviceId,
      updatedAt: Date.now(),
      categories,
    });
  } catch (error) {
    console.warn(
      "BONO movie categories cache save failed:",
      error
    );
  }

  return categories;
}

export async function getMovies(
  deviceId: string
): Promise<MovieItem[]> {
  let cached:
    | MoviesCache
    | null = null;

  try {
    cached =
      await getCachedMovies(
        deviceId
      );
  } catch (error) {
    console.warn(
      "BONO movies cache read failed:",
      error
    );
  }

  if (cached?.movies.length) {
    const age =
      Date.now() -
      cached.updatedAt;

    if (age < CACHE_MAX_AGE_MS) {
      console.log(
        `BONO movies cache hit: ${cached.movies.length} movies`
      );

      return cached.movies;
    }

    console.log(
      "BONO movies stale cache returned, refreshing..."
    );

    void fetchMoviesFromNetwork(
      deviceId
    )
      .then(async (movies) => {
        await saveMoviesCache({
          deviceId,
          updatedAt: Date.now(),
          movies,
        });

        console.log(
          `BONO movies cache refreshed: ${movies.length} movies`
        );
      })
      .catch((error) => {
        console.error(
          "BONO movies background refresh failed:",
          error
        );
      });

    return cached.movies;
  }

  console.log(
    "BONO movies cache miss, loading network..."
  );

  const movies =
    await fetchMoviesFromNetwork(
      deviceId
    );

  try {
    await saveMoviesCache({
      deviceId,
      updatedAt: Date.now(),
      movies,
    });

    console.log(
      `BONO movies cache saved: ${movies.length} movies`
    );
  } catch (error) {
    console.warn(
      "BONO movies cache save failed:",
      error
    );
  }

  return movies;
}