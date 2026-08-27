import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

type Device = {
  deviceId: string;
  devicePin: string;
  status: "trial" | "active" | "expired";
  package: "trial" | "1year" | "lifetime";
};

const devices: Device[] = [
  {
    deviceId: "326498",
    devicePin: "457961",
    status: "active",
    package: "1year",
  },
];

type Playlist = {
  id: string;
  deviceId: string;
  name: string;
  type: "m3u" | "xtream";
  url?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
};

const playlists: Playlist[] = [
  {
    id: "playlist-1",
    deviceId: "326498",
    name: "Neo 4K",
    type: "xtream",
    serverUrl: "http://tv.business-cloud-neo.com",
    username: "dfbd3681ded9",
    password: "6d97346e0d",
  },
];

app.use(cors());
app.use(express.json());

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getXtreamPlaylist(
  deviceId: string
): Playlist | undefined {
  return playlists.find(
    (item) =>
      item.deviceId === deviceId &&
      item.type === "xtream"
  );
}

function isValidXtreamPlaylist(
  playlist: Playlist | undefined
): playlist is Playlist & {
  serverUrl: string;
  username: string;
  password: string;
} {
  return Boolean(
    playlist &&
      playlist.serverUrl &&
      playlist.username &&
      playlist.password
  );
}

/*
 * =========================================================
 * HEALTH
 * =========================================================
 */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "BONO Backend",
    message: "BONO Backend is running",
  });
});

/*
 * =========================================================
 * DEVICE LOGIN
 * =========================================================
 */

app.post("/api/device/login", (req, res) => {
  const { deviceId, devicePin } = req.body;

  if (!deviceId || !devicePin) {
    return res.status(400).json({
      ok: false,
      message:
        "Device ID and Device PIN are required.",
    });
  }

  const device = devices.find(
    (item) =>
      item.deviceId === String(deviceId) &&
      item.devicePin === String(devicePin)
  );

  if (!device) {
    return res.status(401).json({
      ok: false,
      message:
        "Invalid Device ID or Device PIN.",
    });
  }

  return res.json({
    ok: true,
    device: {
      deviceId: device.deviceId,
      status: device.status,
      package: device.package,
    },
  });
});

/*
 * =========================================================
 * DEVICE PLAYLISTS
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/playlists",
  (req, res) => {
    const { deviceId } = req.params;

    const device = devices.find(
      (item) =>
        item.deviceId === deviceId
    );

    if (!device) {
      return res.status(404).json({
        ok: false,
        message: "Device not found.",
      });
    }

    const devicePlaylists =
      playlists
        .filter(
          (playlist) =>
            playlist.deviceId ===
            deviceId
        )
        .map((playlist) => ({
          id: playlist.id,
          deviceId:
            playlist.deviceId,
          name: playlist.name,
          type: playlist.type,
        }));

    return res.json({
      ok: true,
      deviceId,
      playlists: devicePlaylists,
    });
  }
);

/*
 * =========================================================
 * LIVE CATEGORIES
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/live/categories",
  async (req, res) => {
    const { deviceId } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_live_categories`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }
     

      const categories =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName:
          playlist.name,
        categories,
      });
    } catch (error) {
      console.error(
        "Xtream categories request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load live categories.",
      });
    }
  }
);

/*
 * =========================================================
 * LIVE STREAMS
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/live/streams",
  async (req, res) => {
    const { deviceId } = req.params;
    const { categoryId } =
      req.query;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      let url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_live_streams`;

      if (
        typeof categoryId ===
          "string" &&
        categoryId
      ) {
        url +=
          `&category_id=${encodeURIComponent(
            categoryId
          )}`;
      }

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const streams =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName:
          playlist.name,
        streams,
      });
    } catch (error) {
      console.error(
        "Xtream streams request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load live streams.",
      });
    }
  }
);

/*
 * =========================================================
 * LIVE EPG
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/epg/:streamId",
  async (req, res) => {
    const {
      deviceId,
      streamId,
    } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_short_epg` +
        `&stream_id=${encodeURIComponent(
          streamId
        )}` +
        `&limit=10`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const epg =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        streamId,
        playlistName:
          playlist.name,
        epg,
      });
    } catch (error) {
      console.error(
        "Xtream EPG request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load EPG.",
      });
    }
  }
);

/*
 * =========================================================
 * LIVE PLAY
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/live/play/:streamId",
  async (req, res) => {
    const {
      deviceId,
      streamId,
    } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found.",
      });
    }

    const streamUrl =
      `${playlist.serverUrl}/live/` +
      `${encodeURIComponent(
        playlist.username
      )}/` +
      `${encodeURIComponent(
        playlist.password
      )}/` +
      `${encodeURIComponent(
        streamId
      )}.ts`;

    return res.redirect(
      302,
      streamUrl
    );
  }
);

/*
 * =========================================================
 * VOD CATEGORIES
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/vod/categories",
  async (req, res) => {
    const { deviceId } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_vod_categories`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const categories =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName:
          playlist.name,
        categories,
      });
    } catch (error) {
      console.error(
        "Xtream VOD categories request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load movie categories.",
      });
    }
  }
);

/*
 * =========================================================
 * VOD STREAMS
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/vod/streams",
  async (req, res) => {
    const { deviceId } = req.params;
    const { categoryId } =
      req.query;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      let url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_vod_streams`;

      if (
        typeof categoryId ===
          "string" &&
        categoryId
      ) {
        url +=
          `&category_id=${encodeURIComponent(
            categoryId
          )}`;
      }

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const streams =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName:
          playlist.name,
        streams,
      });
    } catch (error) {
      console.error(
        "Xtream VOD streams request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load movies.",
      });
    }
  }
);

/*
 * =========================================================
 * VOD PLAY
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/vod/play/:streamId/:extension",
  async (req, res) => {
    const {
      deviceId,
      streamId,
      extension,
    } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found.",
      });
    }

    const safeExtension =
      extension.replace(
        /[^a-zA-Z0-9]/g,
        ""
      );

    if (!safeExtension) {
      return res.status(400).json({
        ok: false,
        message:
          "Invalid movie extension.",
      });
    }

    const streamUrl =
      `${playlist.serverUrl}/movie/` +
      `${encodeURIComponent(
        playlist.username
      )}/` +
      `${encodeURIComponent(
        playlist.password
      )}/` +
      `${encodeURIComponent(
        streamId
      )}.` +
      safeExtension;

    return res.redirect(
      302,
      streamUrl
    );
  }
);

/*
 * =========================================================
 * VOD INFO
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/vod/info/:streamId",
  async (req, res) => {
    const {
      deviceId,
      streamId,
    } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_vod_info` +
        `&vod_id=${encodeURIComponent(
          streamId
        )}`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }
const info =
  await response.json();
const vodInfo =
  info?.info ?? {};

const currentTrailer =
  typeof vodInfo.youtube_trailer ===
    "string"
    ? vodInfo.youtube_trailer.trim()
    : "";

const tmdbId =
  vodInfo.tmdb_id
    ? String(
        vodInfo.tmdb_id
      ).trim()
    : "";
    
  

if (
  !currentTrailer &&
  tmdbId
) {
  const tmdbApiKey =
    process.env.TMDB_API_KEY;

  if (tmdbApiKey) {
    try {
      const tmdbUrl =
        `https://api.themoviedb.org/3/movie/` +
        `${encodeURIComponent(
          tmdbId
        )}/videos` +
        `?api_key=${encodeURIComponent(
          tmdbApiKey
        )}`;

      const tmdbResponse =
        await fetch(
          tmdbUrl
        );

      if (tmdbResponse.ok) {
        const tmdbData =
          await tmdbResponse.json() as {
            results?: Array<{
              key?: string;
              site?: string;
              type?: string;
              official?: boolean;
              name?: string;
            }>;
          };

        const videos =
          tmdbData.results ??
          [];
          

        const trailer =
          videos.find(
            (video) =>
              video.site ===
                "YouTube" &&
              video.type ===
                "Trailer" &&
              video.official ===
                true
          ) ??
          videos.find(
            (video) =>
              video.site ===
                "YouTube" &&
              video.type ===
                "Trailer"
          );

        if (
  trailer?.key
) {
  /*
   * TMDB وجد Trailer حقيقي.
   */
  vodInfo.youtube_trailer =
    trailer.key;

  console.log(
    "BONO TMDB trailer fallback:",
    streamId,
    trailer.key
  );
} else {
  /*
   * TMDB لم يجد Trailer.
   * نبحث في YouTube Data API
   * ونأخذ videoId مباشرة.
   */

  const movieTitle =
    vodInfo.name ||
    vodInfo.o_name ||
    "";

  const releaseDate =
    vodInfo.releasedate ||
    "";

  const yearMatch =
    String(
      releaseDate
    ).match(
      /\b(19|20)\d{2}\b/
    );

  const year =
    yearMatch?.[0] ??
    "";

  const searchQuery =
    [
      movieTitle,
      year,
      "official trailer",
    ]
      .filter(Boolean)
      .join(" ");

  const youtubeApiKey =
    process.env
      .YOUTUBE_API_KEY;

  if (
    searchQuery &&
    youtubeApiKey
  ) {
    try {
      const youtubeUrl =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet` +
        `&type=video` +
        `&maxResults=10` +
        `&q=${encodeURIComponent(
          searchQuery
        )}` +
        `&key=${encodeURIComponent(
          youtubeApiKey
        )}`;

      const youtubeResponse =
        await fetch(
          youtubeUrl
        );

      console.log(
        "BONO YouTube API RESPONSE:",
        youtubeResponse.status,
        youtubeResponse.statusText
      );

      if (
        youtubeResponse.ok
      ) {
        const youtubeData =
          await youtubeResponse
            .json() as {
              items?: Array<{
                id?: {
                  videoId?: string;
                };

                snippet?: {
                  title?: string;
                  channelTitle?: string;
                };
              }>;
            };

        const results =
          youtubeData.items ??
          [];

        

        const preferredChannels =
  [
    "Netflix",
    "Netflix Brasil",
    "Warner Bros.",
    "Sony Pictures",
    "Universal Pictures",
    "Paramount Pictures",
    "Disney",
    "Prime Video",
    "HBO Max",
    "Apple TV",
  ];

/*
 * Normalize text حتى تصبح المقارنة
 * أكثر دقة رغم اختلاف الأحرف والرموز.
 */
const normalizeText = (
  value: string
) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();

const normalizedMovieTitle =
  normalizeText(
    movieTitle
  );

const movieWords =
  normalizedMovieTitle
    .split(" ")
    .filter(
      (word) =>
        word.length >= 3
    );

/*
 * نعطي Score لكل نتيجة.
 */
const scoredResults =
  results
    .map((item) => {
      const title =
        item.snippet
          ?.title ??
        "";

      const channel =
        item.snippet
          ?.channelTitle ??
        "";

      const normalizedTitle =
        normalizeText(
          title
        );

      const normalizedChannel =
        normalizeText(
          channel
        );

      let score = 0;

      /*
       * تطابق اسم الفيلم كاملًا.
       */
      if (
        normalizedMovieTitle &&
        normalizedTitle.includes(
          normalizedMovieTitle
        )
      ) {
        score += 60;
      }

      /*
       * تطابق كلمات اسم الفيلم.
       */
      if (
        movieWords.length > 0
      ) {
        const matchedWords =
          movieWords.filter(
            (word) =>
              normalizedTitle.includes(
                word
              )
          ).length;

        const matchRatio =
          matchedWords /
          movieWords.length;

        score +=
          Math.round(
            matchRatio * 40
          );
      }

      /*
       * وجود Trailer في العنوان.
       */
      if (
        normalizedTitle.includes(
          "trailer"
        )
      ) {
        score += 25;
      }

      /*
       * السنة الصحيحة.
       */
      if (
        year &&
        normalizedTitle.includes(
          year
        )
      ) {
        score += 15;
      }

      /*
       * قناة رسمية/موثوقة.
       */
      const isPreferredChannel =
        preferredChannels.some(
          (preferred) =>
            normalizedChannel.includes(
              normalizeText(
                preferred
              )
            )
        );

      if (
        isPreferredChannel
      ) {
        score += 25;
      }

      /*
       * نعاقب النتائج غير المرغوبة.
       */
      const badWords =
        [
          "reaction",
          "review",
          "recap",
          "explained",
          "breakdown",
          "fan made",
          "fanmade",
          "concept trailer",
          "teaser concept",
        ];

      if (
        badWords.some(
          (word) =>
            normalizedTitle.includes(
              word
            )
        )
      ) {
        score -= 60;
      }

      return {
        item,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score -
        a.score
    );

/*
 * نأخذ أعلى نتيجة.
 */
const bestResult =
  scoredResults[0];

const selectedResult =
  bestResult &&
  bestResult.score >= 55
    ? bestResult.item
    : undefined;

const videoId =
  selectedResult
    ?.id
    ?.videoId;

if (
  videoId
) {
  vodInfo.youtube_trailer =
    videoId;
          console.log(
            "BONO YouTube direct trailer:",
            streamId,
            videoId,
            selectedResult
              ?.snippet
              ?.channelTitle
          );
        }
      }
    } catch (
      youtubeError
    ) {
      console.warn(
        "BONO YouTube trailer lookup failed:",
        youtubeError
      );
    }
  }
}
      }
    } catch (tmdbError) {
      console.warn(
        "BONO TMDB trailer lookup failed:",
        tmdbError
      );
    }
  }
}

      return res.json({
        ok: true,
        deviceId,
        info,
      });
    } catch (error) {
      console.error(
        "Xtream VOD info request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load movie information.",
      });
    }
  }
);

/*
 * =========================================================
 * SERIES CATEGORIES
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/series/categories",
  async (req, res) => {
    const { deviceId } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_series_categories`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const categories =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName:
          playlist.name,
        categories,
      });
    } catch (error) {
      console.error(
        "Xtream series categories request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load series categories.",
      });
    }
  }
);

/*
 * =========================================================
 * SERIES LIST
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/series",
  async (req, res) => {
    const { deviceId } = req.params;

    const { categoryId } =
      req.query;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      let url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_series`;

      if (
        typeof categoryId ===
          "string" &&
        categoryId
      ) {
        url +=
          `&category_id=${encodeURIComponent(
            categoryId
          )}`;
      }

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const series =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName:
          playlist.name,
        series,
      });
    } catch (error) {
      console.error(
        "Xtream series list request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load series.",
      });
    }
  }
);

/*
 * =========================================================
 * SERIES INFO
 *
 * Xtream response عادة يحتوي:
 * info
 * seasons
 * episodes
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/series/info/:seriesId",
  async (req, res) => {
    const {
      deviceId,
      seriesId,
    } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_series_info` +
        `&series_id=${encodeURIComponent(
          seriesId
        )}`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }
  
      const info =
  await response.json();
      return res.json({
        ok: true,
        deviceId,
        info,
      });
    } catch (error) {
      console.error(
        "Xtream series info request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load series information.",
      });
    }
  }
);

/*
 * =========================================================
 * SERIES EPISODE PLAY
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/series/play/:streamId/:extension",
  async (req, res) => {
    const {
      deviceId,
      streamId,
      extension,
    } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found.",
      });
    }

    const safeExtension =
      extension.replace(
        /[^a-zA-Z0-9]/g,
        ""
      );

    if (!safeExtension) {
      return res.status(400).json({
        ok: false,
        message:
          "Invalid episode extension.",
      });
    }

    const streamUrl =
      `${playlist.serverUrl}/series/` +
      `${encodeURIComponent(
        playlist.username
      )}/` +
      `${encodeURIComponent(
        playlist.password
      )}/` +
      `${encodeURIComponent(
        streamId
      )}.` +
      safeExtension;

    return res.redirect(
      302,
      streamUrl
    );
  }
);


/*
 * =========================================================
 * XMLTV EPG RAW TEST
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/epg/xmltv/raw",
  async (req, res) => {
    const { deviceId } = req.params;

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/xmltv.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&prev_days=0` +
        `&next_days=1`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream XMLTV server returned HTTP ${response.status}.`,
        });
      }

      const xml =
        await response.text();

      if (!xml.trim()) {
        return res.status(502).json({
          ok: false,
          message:
            "Xtream XMLTV returned an empty response.",
        });
      }

      res.type("application/xml");

      return res.send(xml);
    } catch (error) {
      console.error(
        "Xtream XMLTV request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load XMLTV EPG.",
      });
    }
  }
);


/*
 * =========================================================
 * XMLTV EPG CHANNEL SEARCH
 * Diagnostic fallback by channel display-name.
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/epg/xmltv/search",
  async (req, res) => {
    const { deviceId } = req.params;
    const { name } = req.query;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message: "Channel name is required.",
      });
    }

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/xmltv.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&prev_days=0` +
        `&next_days=1`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream XMLTV server returned HTTP ${response.status}.`,
        });
      }

      const xml =
        await response.text();

      const decodeXml = (
        value: string
      ) =>
        value
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();

      const normalize = (
        value: string
      ) =>
        value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

      const wanted =
        normalize(name);

      const matches: {
        channelId: string;
        displayName: string;
      }[] = [];

      const channelRegex =
        /<channel\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;

      let channelMatch:
        RegExpExecArray | null;

      while (
        (
          channelMatch =
            channelRegex.exec(xml)
        ) !== null
      ) {
        const channelId =
          decodeXml(
            channelMatch[1] ?? ""
          );

        const body =
          channelMatch[2] ?? "";

        const displayNameRegex =
          /<display-name(?:\s[^>]*)?>([\s\S]*?)<\/display-name>/gi;

        let displayMatch:
          RegExpExecArray | null;

        while (
          (
            displayMatch =
              displayNameRegex.exec(body)
          ) !== null
        ) {
          const displayName =
            decodeXml(
              (
                displayMatch[1] ??
                ""
              ).replace(
                /<!\[CDATA\[([\s\S]*?)\]\]>/g,
                "$1"
              )
            );

          const normalizedDisplay =
            normalize(
              displayName
            );

          if (
            normalizedDisplay.includes(
              wanted
            ) ||
            wanted.includes(
              normalizedDisplay
            )
          ) {
            matches.push({
              channelId,
              displayName,
            });

            break;
          }
        }

        if (
          matches.length >= 20
        ) {
          break;
        }
      }

      return res.json({
        ok: true,
        deviceId,
        query: name,
        matches,
      });
    } catch (error) {
      console.error(
        "Xtream XMLTV channel search failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to search XMLTV channels.",
      });
    }
  }
);


/*
 * =========================================================
 * XMLTV EPG GUIDE
 *
 * Strategy:
 * 1) Try epgId when supplied.
 * 2) If that does not resolve useful programmes, match by
 *    normalized XMLTV display-name.
 * 3) Return NOW / NEXT / LATER in a small JSON response.
 * =========================================================
 */

app.get(
  "/api/device/:deviceId/epg/xmltv/guide",
  async (req, res) => {
    const { deviceId } = req.params;
    const { name, epgId } = req.query;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message: "Channel name is required.",
      });
    }

    const playlist =
      getXtreamPlaylist(deviceId);

    if (
      !isValidXtreamPlaylist(
        playlist
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/xmltv.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&prev_days=0` +
        `&next_days=1`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream XMLTV server returned HTTP ${response.status}.`,
        });
      }

      const xml =
        await response.text();

      if (!xml.trim()) {
        return res.status(502).json({
          ok: false,
          message:
            "Xtream XMLTV returned an empty response.",
        });
      }

      const decodeXml = (
        value: string
      ) =>
        value
          .replace(
            /<!\[CDATA\[([\s\S]*?)\]\]>/g,
            "$1"
          )
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/&#(\d+);/g, (_match, code) =>
            String.fromCharCode(Number(code))
          )
          .trim();

      const stripTags = (
        value: string
      ) =>
        decodeXml(
          value.replace(
            /<[^>]+>/g,
            " "
          )
        )
          .replace(/\s+/g, " ")
          .trim();

      const normalize = (
        value: string
      ) =>
        value
          .toLowerCase()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /^(ar|en|fr|us|uk|qa|sa|ae|dz)\s*[:\-]\s*/i,
            ""
          )
          .replace(
            /\b(uhd|4k|fhd|hd|sd)\b/g,
            " "
          )
          .replace(
            /[^a-z0-9\u0600-\u06ff]+/g,
            " "
          )
          .replace(/\s+/g, " ")
          .trim();

      const parseXmltvDate = (
        value: string
      ): number | null => {
        const match =
          value.trim().match(
            /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-])?(\d{2})?(\d{2})?/
          );

        if (!match) {
          return null;
        }

        const year =
          Number(match[1]);

        const month =
          Number(match[2]) - 1;

        const day =
          Number(match[3]);

        const hour =
          Number(match[4]);

        const minute =
          Number(match[5]);

        const second =
          Number(match[6] ?? "0");

        let timestamp =
          Date.UTC(
            year,
            month,
            day,
            hour,
            minute,
            second
          );

        if (
          match[7] &&
          match[8] &&
          match[9]
        ) {
          const offsetMinutes =
            Number(match[8]) * 60 +
            Number(match[9]);

          const direction =
            match[7] === "+"
              ? 1
              : -1;

          timestamp -=
            direction *
            offsetMinutes *
            60_000;
        }

        return timestamp;
      };

      type XmltvChannel = {
        channelId: string;
        displayName: string;
      };

      const channels:
        XmltvChannel[] = [];

      const channelRegex =
        /<channel\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;

      let channelMatch:
        RegExpExecArray | null;

      while (
        (
          channelMatch =
            channelRegex.exec(xml)
        ) !== null
      ) {
        const channelId =
          decodeXml(
            channelMatch[1] ?? ""
          );

        const body =
          channelMatch[2] ?? "";

        const displayNameMatch =
          body.match(
            /<display-name(?:\s[^>]*)?>([\s\S]*?)<\/display-name>/i
          );

        const displayName =
          displayNameMatch
            ? stripTags(
                displayNameMatch[1] ?? ""
              )
            : "";

        if (
          channelId &&
          displayName
        ) {
          channels.push({
            channelId,
            displayName,
          });
        }
      }

      const wantedName =
        normalize(name);

      const requestedEpgId =
        typeof epgId === "string"
          ? epgId.trim()
          : "";

      let matchedChannel:
        XmltvChannel | null = null;

      if (requestedEpgId) {
        matchedChannel =
          channels.find(
            (channel) =>
              channel.channelId ===
              requestedEpgId
          ) ?? null;
      }

      if (!matchedChannel) {
        matchedChannel =
          channels.find(
            (channel) =>
              normalize(
                channel.displayName
              ) === wantedName
          ) ?? null;
      }

      if (!matchedChannel) {
        matchedChannel =
          channels.find(
            (channel) => {
              const candidate =
                normalize(
                  channel.displayName
                );

              return Boolean(
                candidate &&
                wantedName &&
                (
                  candidate.includes(
                    wantedName
                  ) ||
                  wantedName.includes(
                    candidate
                  )
                )
              );
            }
          ) ?? null;
      }

      if (!matchedChannel) {
        return res.json({
          ok: true,
          deviceId,
          requestedName: name,
          requestedEpgId:
            requestedEpgId ||
            null,
          matchedChannel: null,
          now: null,
          next: null,
          later: null,
        });
      }

      type GuideProgram = {
        title: string;
        description: string;
        start: string;
        end: string;
        startTimestamp: number;
        endTimestamp: number;
      };

      const programs:
        GuideProgram[] = [];

      const programmeRegex =
        /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;

      let programmeMatch:
        RegExpExecArray | null;

      while (
        (
          programmeMatch =
            programmeRegex.exec(xml)
        ) !== null
      ) {
        const attributes =
          programmeMatch[1] ?? "";

        const body =
          programmeMatch[2] ?? "";

        const channelAttr =
          attributes.match(
            /\bchannel="([^"]+)"/i
          );

        if (
          !channelAttr ||
          decodeXml(
            channelAttr[1] ?? ""
          ) !==
            matchedChannel.channelId
        ) {
          continue;
        }

        const startAttr =
          attributes.match(
            /\bstart="([^"]+)"/i
          );

        const stopAttr =
          attributes.match(
            /\bstop="([^"]+)"/i
          );

        if (
          !startAttr ||
          !stopAttr
        ) {
          continue;
        }

        const start =
          startAttr[1] ?? "";

        const end =
          stopAttr[1] ?? "";

        const startTimestamp =
          parseXmltvDate(start);

        const endTimestamp =
          parseXmltvDate(end);

        if (
          startTimestamp === null ||
          endTimestamp === null
        ) {
          continue;
        }

        const titleMatch =
          body.match(
            /<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i
          );

        const descriptionMatch =
          body.match(
            /<desc(?:\s[^>]*)?>([\s\S]*?)<\/desc>/i
          );

        programs.push({
          title:
            titleMatch
              ? stripTags(
                  titleMatch[1] ?? ""
                )
              : "Program",

          description:
            descriptionMatch
              ? stripTags(
                  descriptionMatch[1] ?? ""
                )
              : "",

          start,
          end,
          startTimestamp,
          endTimestamp,
        });
      }

      programs.sort(
        (a, b) =>
          a.startTimestamp -
          b.startTimestamp
      );

      const nowTimestamp =
        Date.now();

      const currentIndex =
        programs.findIndex(
          (program) =>
            program.startTimestamp <=
              nowTimestamp &&
            program.endTimestamp >
              nowTimestamp
        );

      let nowProgram:
        GuideProgram | null =
        null;

      let upcomingPrograms:
        GuideProgram[] = [];

      if (
        currentIndex >= 0
      ) {
        nowProgram =
          programs[
            currentIndex
          ] ?? null;

        /*
         * نرسل 5 برامج مقبلة.
         * الواجهة تعرض أول 3 الآن،
         * ونبقي الباقي جاهزًا للتطوير لاحقًا.
         */
        upcomingPrograms =
          programs.slice(
            currentIndex + 1,
            currentIndex + 6
          );
      } else {
        const firstFutureIndex =
          programs.findIndex(
            (program) =>
              program.startTimestamp >
              nowTimestamp
          );

        if (
          firstFutureIndex >= 0
        ) {
          upcomingPrograms =
            programs.slice(
              firstFutureIndex,
              firstFutureIndex + 5
            );
        }
      }

      const nextProgram =
        upcomingPrograms[0] ??
        null;

      const laterProgram =
        upcomingPrograms[1] ??
        null;

      return res.json({
        ok: true,
        deviceId,
        requestedName: name,
        requestedEpgId:
          requestedEpgId ||
          null,
        matchedChannel,
        now: nowProgram,

        /*
         * توافق مع النسخة القديمة
         */
        next: nextProgram,
        later: laterProgram,

        /*
         * النسخة الجديدة:
         * قائمة البرامج المقبلة
         */
        upcoming:
          upcomingPrograms,
      });
    } catch (error) {
      console.error(
        "Xtream XMLTV guide request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load XMLTV guide.",
      });
    }
  }
);

/*
 * =========================================================
 * START SERVER
 * =========================================================
 */

app.listen(PORT, () => {
  console.log(
    `BONO Backend running on port ${PORT}`
  );
});