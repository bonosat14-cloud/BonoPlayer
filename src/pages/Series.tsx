import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getNativeContinueWatching,
  getNativeResumeProgress,
  openNativeYouTube,
  playNativeFullscreen,
} from "../services/nativePlayer";

import type {
  ContinueWatchingItem,
  ResumeProgress,
} from "../services/nativePlayer";

import {
  getSeries,
  getSeriesCategories,
  getSeriesInfo,
} from "../services/seriesService";

import type {
  SeriesCategory,
  SeriesEpisode,
  SeriesInfo,
  SeriesItem,
  SeriesSeason,
} from "../services/seriesService";

import bonoLogoGold from "../assets/bono_logo_gold.png";

import "./Series.css";

type SeriesProps = {
  onBack: () => void;
};

type FocusArea =
  | "categories"
  | "series"
  | "search"
  | "details"
  | "trailer"
  | "seasons"
  | "episodes";

const SERIES_PER_ROW = 4;
const SERIES_WINDOW_ROWS = 2;

const DEVICE_ID = "326498";

function Series({
  onBack,
}: SeriesProps) {
  const pageRef =
    useRef<HTMLElement>(null);

  const categoryRefs =
    useRef<
      (HTMLDivElement | null)[]
    >([]);

  const episodeRefs =
    useRef<
      (HTMLDivElement | null)[]
    >([]);

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  const [
    focusArea,
    setFocusArea,
  ] =
    useState<FocusArea>(
      "categories"
    );

  const [
    focusedCategory,
    setFocusedCategory,
  ] = useState(0);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState(0);

  const [
    focusedSeries,
    setFocusedSeries,
  ] = useState(0);

  const [
    seriesCategories,
    setSeriesCategories,
  ] =
    useState<
      SeriesCategory[]
    >([]);

  const [
    series,
    setSeries,
  ] =
    useState<
      SeriesItem[]
    >([]);

  const [
    selectedSeries,
    setSelectedSeries,
  ] =
    useState<
      SeriesItem | null
    >(null);

  const [
    seriesInfo,
    setSeriesInfo,
  ] =
    useState<
      SeriesInfo | null
    >(null);

  const [
    seriesInfoLoading,
    setSeriesInfoLoading,
  ] = useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    focusedSeason,
    setFocusedSeason,
  ] = useState(0);

  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState(0);

  const [
    focusedEpisode,
    setFocusedEpisode,
  ] = useState(0);

  const [
    episodeResume,
    setEpisodeResume,
  ] = useState<
    Record<
      string,
      ResumeProgress
    >
  >({});

  const [
    continueWatching,
    setContinueWatching,
  ] = useState<
    ContinueWatchingItem[]
  >([]);

  /*
   * =========================================================
   * LOAD SERIES
   * =========================================================
   */

  useEffect(() => {
    const loadSeries =
      async () => {
        try {
          const [
            loadedCategories,
            loadedSeries,
          ] =
            await Promise.all([
              getSeriesCategories(
                DEVICE_ID
              ),

              getSeries(
                DEVICE_ID
              ),
            ]);

          setSeriesCategories(
            loadedCategories
          );

          setSeries(
            loadedSeries
          );

          console.log(
            `BONO Series loaded: ${loadedSeries.length}`
          );
        } catch (error) {
          console.error(
            "BONO Series load failed:",
            error
          );
        }
      };

    void loadSeries();
  }, []);

  /*
   * =========================================================
   * CONTINUE WATCHING - SERIES
   * =========================================================
   */

  useEffect(() => {
    const loadContinueWatching =
      async () => {
        try {
          const items =
            await getNativeContinueWatching();

          setContinueWatching(
            items.filter(
              (item) =>
                item.contentType ===
                  "episode" &&
                Boolean(item.seriesId)
            )
          );
        } catch (error) {
          console.warn(
            "BONO Series Continue Watching load failed:",
            error
          );

          setContinueWatching([]);
        }
      };

    void loadContinueWatching();
  }, []);

  const continueWatchingSeriesIds =
    useMemo(() => {
      return new Set(
        continueWatching
          .map((item) =>
            String(
              item.seriesId ?? ""
            )
          )
          .filter(Boolean)
      );
    }, [continueWatching]);

  const continueWatchingSeriesCount =
    useMemo(() => {
      return series.filter((item) =>
        continueWatchingSeriesIds.has(
          String(item.id)
        )
      ).length;
    }, [
      series,
      continueWatchingSeriesIds,
    ]);

  /*
   * =========================================================
   * INITIAL FOCUS
   * =========================================================
   */

  useEffect(() => {
    pageRef.current?.focus();
  }, []);

  /*
   * =========================================================
   * CATEGORIES
   * =========================================================
   */

  const categories =
    useMemo(
      () => [
        {
          category_id: "all",
          category_name: "All",
        },
        {
          category_id:
            "continue-watching",
          category_name:
            "Continue Watching",
        },
        ...seriesCategories,
      ],
      [
        seriesCategories,
      ]
    );
    const seriesCountByCategory =
  useMemo(() => {
    const counts =
      new Map<
        string,
        number
      >();

    for (
      const item of series
    ) {
      const categoryId =
        String(
          item.categoryId ??
            ""
        );

      counts.set(
        categoryId,
        (counts.get(
          categoryId
        ) ?? 0) + 1
      );
    }

    return counts;
  }, [series]);

  /*
   * =========================================================
   * CATEGORY SCROLL
   * =========================================================
   */

  useEffect(() => {
    if (
      focusArea !==
      "categories"
    ) {
      return;
    }

    const element =
      categoryRefs.current[
        focusedCategory
      ];

    if (!element) {
      return;
    }

    element.scrollIntoView({
      block: "center",
      behavior: "auto",
    });

    pageRef.current?.focus();
  }, [
    focusedCategory,
    focusArea,
  ]);

  /*
   * =========================================================
   * EPISODE SCROLL
   * =========================================================
   */

  useEffect(() => {
    if (
      focusArea !==
      "episodes"
    ) {
      return;
    }

    const element =
      episodeRefs.current[
        focusedEpisode
      ];

    if (!element) {
      return;
    }

    element.scrollIntoView({
      block: "center",
      behavior: "auto",
    });

    pageRef.current?.focus();
  }, [
    focusedEpisode,
    focusArea,
  ]);

  /*
   * =========================================================
   * SEARCH INPUT
   * =========================================================
   */

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          searchInputRef.current?.focus();
        },
        100
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [searchOpen]);

  /*
   * =========================================================
   * FILTER SERIES
   * =========================================================
   */

  const visibleSeries =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (query) {
        return series.filter(
          (item) =>
            item.title
              .toLowerCase()
              .includes(
                query
              )
        );
      }

      if (
        selectedCategory ===
        0
      ) {
        return series;
      }

      const selectedCategoryId =
        categories[
          selectedCategory
        ]?.category_id;

      if (
        selectedCategoryId ===
        "continue-watching"
      ) {
        return series.filter(
          (item) =>
            continueWatchingSeriesIds.has(
              String(item.id)
            )
        );
      }

      const categoryId =
        categories[
          selectedCategory
        ]?.category_id;

      return series.filter(
        (item) =>
          item.categoryId ===
          categoryId
      );
    }, [
      series,
      searchQuery,
      selectedCategory,
      categories,
      continueWatchingSeriesIds,
    ]);

  /*
   * =========================================================
   * SAFE SERIES INDEX
   * =========================================================
   */

  useEffect(() => {
    if (
      visibleSeries.length ===
      0
    ) {
      setFocusedSeries(0);
      return;
    }

    setFocusedSeries(
      (current) =>
        Math.min(
          current,
          visibleSeries.length -
            1
        )
    );
  }, [
    visibleSeries.length,
  ]);

  /*
   * =========================================================
   * SERIES WINDOW
   * 5 × 3 = 15 Posters
   * =========================================================
   */

  const SERIES_WINDOW_SIZE =
    SERIES_PER_ROW *
    SERIES_WINDOW_ROWS;

  const focusedRow =
    Math.floor(
      focusedSeries /
        SERIES_PER_ROW
    );

  const maxStartRow =
    Math.max(
      0,
      Math.ceil(
        visibleSeries.length /
          SERIES_PER_ROW
      ) -
        SERIES_WINDOW_ROWS
    );

  const seriesWindowStartRow =
    Math.max(
      0,
      Math.min(
        focusedRow - 1,
        maxStartRow
      )
    );

  const seriesWindowStart =
    seriesWindowStartRow *
    SERIES_PER_ROW;

  const renderedSeries =
    visibleSeries.slice(
      seriesWindowStart,
      seriesWindowStart +
        SERIES_WINDOW_SIZE
    );

  /*
   * =========================================================
   * SERIES INFO
   * =========================================================
   */

  const openSeriesDetails =
    async (
      item: SeriesItem
    ) => {
      setSelectedSeries(
        item
      );

      setSeriesInfo(
        null
      );

      setSeriesInfoLoading(
        true
      );

      setFocusedSeason(0);
      setSelectedSeason(0);
      setFocusedEpisode(0);

      setFocusArea(
        "details"
      );

      try {
        const info =
          await getSeriesInfo(
            DEVICE_ID,
            item.id
          );

        setSeriesInfo(
          info
        );

        console.log(
          "BONO Series details:",
          info.title
        );
      } catch (error) {
        console.error(
          "BONO Series info failed:",
          error
        );
      } finally {
        setSeriesInfoLoading(
          false
        );

        pageRef.current?.focus();
      }
    };

  /*
   * =========================================================
   * SEASONS
   * =========================================================
   */

  const seasons:
    SeriesSeason[] =
    seriesInfo?.seasons ??
    [];

  const currentSeason:
    SeriesSeason | null =
    seasons[
      selectedSeason
    ] ?? null;

  const episodes:
    SeriesEpisode[] =
    currentSeason?.episodes ??
    [];
  
  const openSeriesTrailer =
  async () => {
    const trailerValue =
      seriesInfo
        ?.youtubeTrailer
        ?.trim() ??
      "";

    if (!trailerValue) {
      console.warn(
        "BONO Series Trailer unavailable"
      );

      return;
    }

    console.log(
      "BONO Series Trailer value:",
      trailerValue
    );

    try {
      await openNativeYouTube(
        trailerValue
      );

      console.log(
        "BONO Series YouTube launched"
      );
    } catch (error) {
      console.error(
        "BONO Series Trailer open failed:",
        error
      );
    }
  };
     
  /*
   * =========================================================
   * EPISODE RESUME PROGRESS
   * =========================================================
   */

  useEffect(() => {
    if (
      !selectedSeries ||
      !currentSeason ||
      episodes.length === 0
    ) {
      setEpisodeResume({});
      return;
    }

    let cancelled =
      false;

    const loadResume =
      async () => {
        const next:
          Record<
            string,
            ResumeProgress
          > = {};

        for (
          const episode
          of episodes
        ) {
          try {
            const resume =
              await getNativeResumeProgress({
                contentType:
                  "episode",

                contentId:
                  String(
                    episode.id
                  ),

                seriesId:
                  String(
                    selectedSeries.id
                  ),

                seasonNumber:
                  currentSeason
                    .seasonNumber,

                episodeNumber:
                  episode
                    .episodeNumber,
              });

            if (cancelled) {
              return;
            }

            next[
              String(
                episode.id
              )
            ] = resume;
          } catch (
            error
          ) {
            console.warn(
              "BONO Episode resume read failed:",
              episode.id,
              error
            );
          }
        }

        if (!cancelled) {
          setEpisodeResume(
            next
          );
        }
      };

    void loadResume();

    return () => {
      cancelled =
        true;
    };
  }, [
    selectedSeries,
    currentSeason,
    episodes,
  ]);

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

  const openSearch =
    () => {
      setSearchOpen(true);
      setFocusArea(
        "search"
      );
    };

  const closeSearch =
    () => {
      setSearchOpen(false);
      setFocusArea(
        "search"
      );

      pageRef.current?.focus();
    };

  /*
   * =========================================================
   * BACK
   * =========================================================
   */

  const handleSeriesBack =
    useCallback(() => {
      if (
        focusArea ===
        "episodes"
      ) {
        setFocusArea(
          "seasons"
        );

        pageRef.current?.focus();

        return;
      }

      if (
        focusArea ===
        "seasons"
      ) {
        setFocusArea(
          "details"
        );

        pageRef.current?.focus();

        return;
      }

      if (
        focusArea ===
        "details"
      ) {
        setSeriesInfo(
          null
        );

        setSelectedSeries(
          null
        );

        setFocusArea(
          "series"
        );

        pageRef.current?.focus();

        return;
      }

      if (searchOpen) {
        setSearchOpen(
          false
        );

        pageRef.current?.focus();

        return;
      }

      if (
        focusArea ===
        "search"
      ) {
        setSearchQuery(
          ""
        );

        setFocusedSeries(
          0
        );

        setFocusArea(
          "categories"
        );

        pageRef.current?.focus();

        return;
      }

      if (
  focusArea ===
  "series"
) {
  setSearchQuery("");
  setSearchOpen(false);
  setFocusedSeries(0);

  setFocusArea(
    "categories"
  );

  pageRef.current?.focus();

  return;
}

      if (
        focusArea ===
        "categories"
      ) {
        onBack();
      }
    }, [
      focusArea,
      searchOpen,
      onBack,
    ]);

  /*
   * =========================================================
   * ANDROID BACK
   * =========================================================
   */

  useEffect(() => {
    const handleBonoBack =
      () => {
        handleSeriesBack();
      };

    window.addEventListener(
      "bonoBack",
      handleBonoBack
    );

    return () => {
      window.removeEventListener(
        "bonoBack",
        handleBonoBack
      );
    };
  }, [
    handleSeriesBack,
  ]);

  /*
   * =========================================================
   * KEYBOARD / REMOTE
   * =========================================================
   */

  const handleKeyDown = (
    event:
      React.KeyboardEvent<HTMLElement>
  ) => {
    if (searchOpen) {
      const key =
        event.key;

      const code =
        event.keyCode;

      const back =
        key === "Escape" ||
        key === "Esc" ||
        code === 4;

      if (back) {
        event.preventDefault();

        closeSearch();

        return;
      }

      if (
        key === "Enter" ||
        code === 13
      ) {
        event.preventDefault();

        setSearchOpen(
          false
        );

        setFocusedSeries(
          0
        );

        setFocusArea(
          "series"
        );

        pageRef.current?.focus();

        return;
      }

      return;
    }

    const key =
      event.key;

    const code =
      event.keyCode;

    const left =
      key ===
        "ArrowLeft" ||
      key === "Left" ||
      code === 37;

    const right =
      key ===
        "ArrowRight" ||
      key === "Right" ||
      code === 39;

    const up =
      key ===
        "ArrowUp" ||
      key === "Up" ||
      code === 38;

    const down =
      key ===
        "ArrowDown" ||
      key === "Down" ||
      code === 40;

    const enter =
      key === "Enter" ||
      key === "OK" ||
      code === 13;

    const back =
      key === "Escape" ||
      key === "Esc" ||
      key ===
        "Backspace" ||
      code === 4;

   /*
 * =========================================================
 * DETAILS - SEASONS BUTTON
 * =========================================================
 */

if (
  focusArea ===
  "details"
) {
  /*
   * OK = OPEN SEASONS
   */
  if (enter) {
    event.preventDefault();

    if (
      seasons.length > 0
    ) {
      setFocusedSeason(0);

      setSelectedSeason(0);

      setFocusArea(
        "seasons"
      );
    }

    return;
  }

  /*
   * LEFT = MOVE TO TRAILER
   */
  if (left) {
    event.preventDefault();

    if (
      seriesInfo?.youtubeTrailer
    ) {
      setFocusArea(
        "trailer"
      );
    }

    return;
  }

  /*
   * RIGHT = DO NOTHING
   * SEASONS IS THE RIGHT BUTTON
   */
  if (right) {
    event.preventDefault();

    return;
  }

  /*
   * DOWN = DO NOTHING
   */
  if (down) {
    event.preventDefault();

    return;
  }

  /*
   * BACK = RETURN TO SERIES
   */
  if (back) {
    event.preventDefault();

    handleSeriesBack();

    return;
  }

  return;
}


/*
 * =========================================================
 * TRAILER BUTTON
 * =========================================================
 */

if (
  focusArea ===
  "trailer"
) {
  /*
   * OK = PLAY TRAILER
   */
  if (enter) {
    event.preventDefault();

    openSeriesTrailer();

    return;
  }

  /*
   * RIGHT = MOVE TO SEASONS BUTTON
   */
  if (right) {
    event.preventDefault();

    setFocusArea(
      "details"
    );

    return;
  }

  /*
   * LEFT = DO NOTHING
   * TRAILER IS THE LEFT BUTTON
   */
  if (left) {
    event.preventDefault();

    return;
  }

  /*
   * DOWN = DO NOTHING
   */
  if (down) {
    event.preventDefault();

    return;
  }

  /*
   * UP = DO NOTHING
   */
  if (up) {
    event.preventDefault();

    return;
  }

  /*
   * BACK = RETURN FOCUS TO SEASONS
   */
  if (back) {
    event.preventDefault();

    setFocusArea(
      "details"
    );

    return;
  }

  return;
}

/*
 * =========================================================
 * SEASONS
 * =========================================================
 */

if (
  focusArea ===
  "seasons"
) {
  /*
   * LEFT = PREVIOUS SEASON
   */
  if (left) {
    event.preventDefault();

    setFocusedSeason(
      (current) =>
        Math.max(
          0,
          current - 1
        )
    );

    return;
  }

  /*
   * RIGHT = NEXT SEASON
   */
  if (right) {
    event.preventDefault();

    setFocusedSeason(
      (current) =>
        Math.min(
          Math.max(
            0,
            seasons.length - 1
          ),
          current + 1
        )
    );

    return;
  }

  /*
   * OK / DOWN = OPEN EPISODES
   */
  if (
    enter ||
    down
  ) {
    event.preventDefault();

    if (
      seasons.length === 0
    ) {
      return;
    }

    setSelectedSeason(
      focusedSeason
    );

    setFocusedEpisode(
      0
    );

    setFocusArea(
      "episodes"
    );

    return;
  }

  /*
   * UP = RETURN TO SEASONS BUTTON
   */
  if (up) {
    event.preventDefault();

    setFocusArea(
      "details"
    );

    return;
  }

  /*
   * BACK = RETURN TO DETAILS
   */
  if (back) {
    event.preventDefault();

    handleSeriesBack();

    return;
  }

  return;
}

    /*
     * EPISODES
     */

    if (
      focusArea ===
      "episodes"
    ) {
      if (up) {
        event.preventDefault();

        setFocusedEpisode(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );

        return;
      }

      if (down) {
        event.preventDefault();

        setFocusedEpisode(
          (current) =>
            Math.min(
              Math.max(
                0,
                episodes.length -
                  1
              ),
              current + 1
            )
        );

        return;
      }

      if (left) {
        event.preventDefault();

        setFocusArea(
          "seasons"
        );

        return;
      }

      if (enter) {
        event.preventDefault();

        const episode =
          episodes[
            focusedEpisode
          ];

        if (episode) {
          void playNativeFullscreen({
            streamUrl:
              episode.streamUrl,

            contentType:
              "episode",

            contentId:
              String(
                episode.id
              ),

            title:
              episode.title,

            seriesId:
              selectedSeries
                ? String(
                    selectedSeries.id
                  )
                : undefined,

            seasonNumber:
              currentSeason
                ?.seasonNumber,

            episodeNumber:
              episode.episodeNumber,
          });
        }

        return;
      }

      if (back) {
        event.preventDefault();

        handleSeriesBack();

        return;
      }

      return;
    }

    /*
     * LEFT
     */

    if (left) {
      event.preventDefault();

      if (
        focusArea ===
        "search"
      ) {
        setFocusArea(
          "categories"
        );

        return;
      }

      if (
        focusArea ===
        "series"
      ) {
        setFocusedSeries(
          (current) => {
            if (
              current %
                SERIES_PER_ROW ===
              0
            ) {
              setFocusArea(
                "categories"
              );

              return current;
            }

            return Math.max(
              0,
              current - 1
            );
          }
        );
      }

      return;
    }

    /*
     * RIGHT
     */

    if (right) {
      event.preventDefault();

      if (
  focusArea ===
  "categories"
) {
  setFocusedSeries(0);

  setFocusArea(
    "series"
  );

  return;
}

      if (
        focusArea ===
        "series"
      ) {
        setFocusedSeries(
          (current) => {
            const isLastColumn =
              current %
                SERIES_PER_ROW ===
              SERIES_PER_ROW -
                1;

            const isLastSeries =
              current >=
              visibleSeries.length -
                1;

            if (
              isLastColumn ||
              isLastSeries
            ) {
              return current;
            }

            return current + 1;
          }
        );
      }

      return;
    }

    /*
     * UP
     */

    if (up) {
      event.preventDefault();

      if (
        focusArea ===
        "categories"
      ) {
        if (
          focusedCategory ===
          0
        ) {
          setFocusArea(
            "search"
          );

          return;
        }

        setFocusedCategory(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );

        return;
      }

      if (
        focusArea ===
        "series"
      ) {
        if (
          focusedSeries <
          SERIES_PER_ROW
        ) {
          setFocusArea(
            "search"
          );

          return;
        }

        setFocusedSeries(
          (current) =>
            Math.max(
              0,
              current -
                SERIES_PER_ROW
            )
        );

        return;
      }

      return;
    }

    /*
     * DOWN
     */

    if (down) {
      event.preventDefault();

      if (
        focusArea ===
        "search"
      ) {
        setFocusArea(
          "series"
        );

        setFocusedSeries(
          0
        );

        return;
      }

      if (
        focusArea ===
        "categories"
      ) {
        setFocusedCategory(
          (current) =>
            Math.min(
              categories.length -
                1,
              current + 1
            )
        );

        return;
      }

      if (
        focusArea ===
        "series"
      ) {
        setFocusedSeries(
          (current) => {
            const next =
              current +
              SERIES_PER_ROW;

            if (
              next <
              visibleSeries.length
            ) {
              return next;
            }

            return current;
          }
        );

        return;
      }

      return;
    }

    /*
     * ENTER
     */

    if (enter) {
      event.preventDefault();

      if (
        focusArea ===
        "search"
      ) {
        openSearch();

        return;
      }

      if (
        focusArea ===
        "categories"
      ) {

setSearchQuery("");
setSearchOpen(false);

        setSelectedCategory(
          focusedCategory
        );

        setFocusedSeries(
          0
        );

        setFocusArea(
          "series"
        );

        return;
      }

      if (
        focusArea ===
        "series"
      ) {
        const item =
          visibleSeries[
            focusedSeries
          ];

        if (item) {
          void openSeriesDetails(
            item
          );
        }

        return;
      }
    }

    /*
     * BACK
     */

    if (back) {
      event.preventDefault();

      handleSeriesBack();

      return;
    }
  };

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <main
      ref={pageRef}
      className="series-page"
      tabIndex={0}
      onKeyDown={
        handleKeyDown
      }
    >
     <header className="series-header">
  <div className="series-brand">
    <img
      className="series-brand-logo"
      src={bonoLogoGold}
      alt="BONO"
    />
  </div>

  <div className="series-title">
    <span className="series-title-icon">
      ▰
    </span>

    <h1>SERIES</h1>
  </div>

  <div
    className={`series-search-button ${
      focusArea === "search"
        ? "is-focused"
        : ""
    }`}
  >
          <span className="series-search-symbol">
            ⌕
          </span>

          <div className="series-search-copy">
            <span>
              SEARCH
            </span>

            <strong>
              {searchQuery ||
                "Search series"}
            </strong>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="series-search-overlay">
          <div className="series-search-box">
            <span className="series-search-icon">
              ⌕
            </span>

            <input
              ref={
                searchInputRef
              }
              value={
                searchQuery
              }
              onChange={(
                event
              ) => {
                setSearchQuery(
                  event.target
                    .value
                );

                setFocusedSeries(
                  0
                );
              }}
              placeholder="Search series..."
              autoComplete="off"
              spellCheck={
                false
              }
            />

            <span className="series-search-count">
              {
                visibleSeries.length
              }
            </span>
          </div>
        </div>
      )}

      {selectedSeries && (
        <section
  className="series-details-fullscreen"
  style={{
    backgroundImage: (
      seriesInfo?.backdrop ||
      seriesInfo?.poster ||
      selectedSeries.poster
    )
      ? `url("${
          seriesInfo?.backdrop ||
          seriesInfo?.poster ||
          selectedSeries.poster
        }")`
      : undefined,
  }}
>
          <div className="series-details-background-glow" />

          <div className="series-details-layout">

            <div className="series-details-poster">
              {(
                seriesInfo?.poster ||
                selectedSeries.poster
              ) ? (
                <img
                  src={
                    seriesInfo?.poster ||
                    selectedSeries.poster
                  }
                  alt=""
                />
              ) : (
                <span>
                  {selectedSeries.title
                    .slice(
                      0,
                      2
                    )
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="series-details-content">
              <span className="series-details-label">
                SERIES
              </span>

              <h2>
                {seriesInfo?.title ||
                  selectedSeries.title}
              </h2>

              <div className="series-details-badges">
                {(
                  seriesInfo?.year ||
                  selectedSeries.year
                ) && (
                  <span>
                    {seriesInfo?.year ||
                      selectedSeries.year}
                  </span>
                )}

                {(
                  seriesInfo?.rating ||
                  selectedSeries.rating
                ) && (
                  <span className="series-detail-rating">
                    ★{" "}
                    {seriesInfo?.rating ||
                      selectedSeries.rating}
                  </span>
                )}

                {seriesInfo
                  ?.genre && (
                  <span>
                    {
                      seriesInfo.genre
                    }
                  </span>
                )}

                {seriesInfo && (
                  <span>
                    {
                      seriesInfo
                        .seasons
                        .length
                    }{" "}
                    Seasons
                  </span>
                )}
              </div>

              {seriesInfoLoading ? (
                <p className="series-details-loading">
                  Loading series information...
                </p>
              ) : (
                <p className="series-details-plot">
                  {seriesInfo
                    ?.plot ||
                    selectedSeries.plot ||
                    "No description available."}
                </p>
              )}

              {seriesInfo && (
                <div className="series-details-info-grid">
                  {seriesInfo
                    .releaseDate && (
                    <div className="series-detail-info">
                      <span>
                        RELEASE DATE
                      </span>

                      <strong>
                        {
                          seriesInfo.releaseDate
                        }
                      </strong>
                    </div>
                  )}

                  {seriesInfo
                    .director && (
                    <div className="series-detail-info">
                      <span>
                        DIRECTOR
                      </span>

                      <strong>
                        {
                          seriesInfo.director
                        }
                      </strong>
                    </div>
                  )}

                  {seriesInfo
                    .cast && (
                    <div className="series-detail-info series-detail-info-wide">
                      <span>
                        CAST
                      </span>

                      <strong>
                        {
                          seriesInfo.cast
                        }
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div className="series-details-actions">

  {seriesInfo?.youtubeTrailer && (
    <div
      className={`series-trailer-button ${
        focusArea === "trailer"
          ? "is-focused"
          : ""
      }`}
    >
      <span className="series-trailer-icon">
        ▶
      </span>

      TRAILER
    </div>
  )}

  <div
    className={`series-open-seasons ${
      focusArea === "details"
        ? "is-focused"
        : ""
    }`}
  >
    SEASONS

    <span>
      ›
    </span>
  </div>

</div>

              <span className="series-details-hint">
  OK Select • LEFT/RIGHT Actions • BACK Return
</span>
            </div>

          </div>

          {(
            focusArea ===
              "seasons" ||
            focusArea ===
              "episodes"
          ) && (
            <div className="series-seasons-panel">

              <div className="series-seasons-title">
                Seasons
              </div>

              <div className="series-seasons-row">
                {seasons.map(
                  (
                    season,
                    index
                  ) => (
                    <div
                      key={
                        season.seasonNumber
                      }
                      className={`series-season-card ${
                        focusedSeason ===
                          index &&
                        focusArea ===
                          "seasons"
                          ? "is-focused"
                          : ""
                      }`}
                    >
                      <strong>
                        {
                          season.name
                        }
                      </strong>

                      <span>
                        {
                          season
                            .episodes
                            .length
                        }{" "}
                        Episodes
                      </span>
                    </div>
                  )
                )}
              </div>

              {focusArea ===
                "episodes" && (
                <div className="series-episodes-panel">
                  <div className="series-episodes-title">
                    {currentSeason?.name ||
                      "Episodes"}
                  </div>

                  <div className="series-episodes-list">
                    {episodes.map(
                      (
                        episode,
                        index
                      ) => (
                        <div
                          key={
                            episode.id
                          }
                          ref={(element) => {
                            episodeRefs.current[
                              index
                            ] = element;
                          }}
                          className={`series-episode-row ${
                            focusedEpisode ===
                            index
                              ? "is-focused"
                              : ""
                          }`}
                        >
                          <div className="series-episode-number">
                            {
                              episode.episodeNumber
                            }
                          </div>

                          <div className="series-episode-copy">
                            <strong>
                              {
                                episode.title
                              }
                            </strong>

                            {episodeResume[
                              String(
                                episode.id
                              )
                            ]?.hasResume ? (
                              <span>
                                RESUME{" "}
                                {Math.round(
                                  episodeResume[
                                    String(
                                      episode.id
                                    )
                                  ].progress *
                                    100
                                )}
                                %
                              </span>
                            ) : (
                              episode.duration && (
                                <span>
                                  {
                                    episode.duration
                                  }
                                </span>
                              )
                            )}
                          </div>

                          <div className="series-episode-play">
                            {episodeResume[
                              String(
                                episode.id
                              )
                            ]?.hasResume
                              ? "▶ RESUME"
                              : "▶"}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </section>
      )}

      <section className="series-layout">

        <aside className="series-categories">
          <div className="series-column-title">
            Categories
          </div>

          {categories.map(
            (
              category,
              index
            ) => (
              <div
                key={
                  category.category_id
                }
                ref={(
                  element
                ) => {
                  categoryRefs.current[
                    index
                  ] =
                    element;
                }}
                className={`series-category ${
                  focusArea ===
                    "categories" &&
                  focusedCategory ===
                    index
                    ? "is-focused"
                    : ""
                }`}
              >
                <span className="series-category-name">
  {category.category_name}
</span>

<span className="series-category-count">
  {category.category_id ===
  "all"
    ? series.length
    : category.category_id ===
        "continue-watching"
      ? continueWatchingSeriesCount
      : seriesCountByCategory.get(
          String(
            category.category_id
          )
        ) ?? 0}
</span>
              </div>
            )
          )}
        </aside>

        <section className="series-content">

  <div className="series-grid-header">
    <h2>
      {categories[selectedCategory]
        ?.category_name || "All"}
    </h2>

    <span>
      {visibleSeries.length} Series
    </span>
  </div>

  <section className="series-grid">
    {renderedSeries.length > 0 ? (
      renderedSeries.map(
        (
          item,
          index
        ) => {
          const actualIndex =
            seriesWindowStart +
            index;

          return (
            <div
              key={item.id}
              className={`series-card ${
                focusArea ===
                  "series" &&
                focusedSeries ===
                  actualIndex
                  ? "is-focused"
                  : ""
              }`}
            >
              <div
  className="series-poster"
  style={
    item.poster
      ? {
          backgroundImage: `url("${item.poster}")`,
        }
      : undefined
  }
>
  {item.poster ? (
                  <img
                    src={
                      item.poster
                    }
                    alt=""
                    loading="lazy"
                    className="series-poster-image"
                  />
                ) : (
                  <span>
                    {item.title
                      .slice(
                        0,
                        2
                      )
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <strong>
                {item.title}
              </strong>

              <span>
                {item.category}
              </span>
            </div>
          );
        }
      )
    ) : (
      <div className="series-empty">
        No series found
      </div>
    )}
  </section>

</section>
      </section>
    </main>
  );
}

export default Series;