import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  openNativeYouTube,
  playNativeFullscreen,
} from "../services/nativePlayer";

import {
  getMovieCategories,
  getMovieInfo,
  getMovies,
} from "../services/moviesService";

import type {
  MovieCategory,
  MovieInfo,
  MovieItem,
} from "../services/moviesService";

import "./Movies.css";

type MoviesProps = {
  onBack: () => void;
};

type FocusArea =
  | "categories"
  | "movies"
  | "search"
  | "details";

const MOVIES_PER_ROW = 5;
const MOVIE_WINDOW_ROWS = 3;





function Movies({
  onBack,
}: MoviesProps) {
  const pageRef =
    useRef<HTMLElement>(null);

  const categoryRefs =
    useRef<(HTMLDivElement | null)[]>([]);

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  const [focusArea, setFocusArea] =
    useState<FocusArea>("categories");

  const [
    focusedCategory,
    setFocusedCategory,
  ] = useState(0);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState(0);

  const [
    focusedMovie,
    setFocusedMovie,
  ] = useState(0);

  const [
    movieCategories,
    setMovieCategories,
  ] = useState<MovieCategory[]>([]);

  const [
    movies,
    setMovies,
  ] = useState<MovieItem[]>([]);

  const [
    selectedMovie,
    setSelectedMovie,
  ] = useState<MovieItem | null>(null);

  const [
    movieInfo,
    setMovieInfo,
  ] = useState<MovieInfo | null>(null);

  const [
    movieInfoLoading,
    setMovieInfoLoading,
  ] = useState(false);

  const [
    movieInfoError,
    setMovieInfoError,
  ] = useState("");

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    detailsAction,
    setDetailsAction,
  ] = useState<0 | 1>(0);

  /*
   * =========================================================
   * LOAD MOVIES
   * =========================================================
   */

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const [
          loadedCategories,
          loadedMovies,
        ] = await Promise.all([
          getMovieCategories("326498"),
          getMovies("326498"),
        ]);

        setMovieCategories(
          loadedCategories
        );

        setMovies(
          loadedMovies
        );

        console.log(
          `BONO Movies loaded: ${loadedMovies.length}`
        );
      } catch (error) {
        console.error(
          "BONO Movies load failed:",
          error
        );
      }
    };

    void loadMovies();
  }, []);

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
        ...movieCategories,
      ],
      [movieCategories]
    );

  const movieCategoryCounts =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      for (
        const movie
        of movies
      ) {
        counts.set(
          movie.categoryId,
          (
            counts.get(
              movie.categoryId
            ) ?? 0
          ) + 1
        );
      }

      return counts;
    }, [
      movies,
    ]);

  const getMovieCategoryCount =
    (
      categoryId: string
    ) => {
      if (
        categoryId ===
        "all"
      ) {
        return movies.length;
      }

      return (
        movieCategoryCounts.get(
          categoryId
        ) ?? 0
      );
    };

  /*
   * =========================================================
   * CATEGORY SCROLL
   * =========================================================
   */

  useEffect(() => {
    if (
      focusArea !== "categories"
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
   * SEARCH INPUT
   * =========================================================
   */

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchOpen]);

  /*
   * =========================================================
   * FILTER MOVIES
   * =========================================================
   */

  const visibleMovies =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      /*
       * SEARCH:
       * Search inside all movies.
       */
      if (query) {
        return movies.filter(
          (movie) =>
            movie.title
              .toLowerCase()
              .includes(query)
        );
      }

      /*
       * ALL
       */
      if (
        selectedCategory === 0
      ) {
        return movies;
      }

      /*
       * SELECTED CATEGORY
       */
      const categoryId =
        categories[
          selectedCategory
        ]?.category_id;

      return movies.filter(
        (movie) =>
          movie.categoryId ===
          categoryId
      );
    }, [
      movies,
      searchQuery,
      selectedCategory,
      categories,
    ]);

  /*
   * =========================================================
   * KEEP MOVIE INDEX SAFE
   * =========================================================
   */

  useEffect(() => {
    if (
      visibleMovies.length === 0
    ) {
      setFocusedMovie(0);
      return;
    }

    setFocusedMovie(
      (current) =>
        Math.min(
          current,
          visibleMovies.length - 1
        )
    );
  }, [visibleMovies.length]);

  /*
   * =========================================================
   * MOVIE WINDOW
   *
   * 5 columns x 3 rows = 15 movies only in DOM.
   * =========================================================
   */

  const MOVIE_WINDOW_SIZE =
    MOVIES_PER_ROW *
    MOVIE_WINDOW_ROWS;

  const focusedRow =
    Math.floor(
      focusedMovie /
        MOVIES_PER_ROW
    );

  const maxStartRow =
    Math.max(
      0,
      Math.ceil(
        visibleMovies.length /
          MOVIES_PER_ROW
      ) - MOVIE_WINDOW_ROWS
    );

  const movieWindowStartRow =
    Math.max(
      0,
      Math.min(
        focusedRow - 1,
        maxStartRow
      )
    );

  const movieWindowStart =
    movieWindowStartRow *
    MOVIES_PER_ROW;

  const renderedMovies =
    visibleMovies.slice(
      movieWindowStart,
      movieWindowStart +
        MOVIE_WINDOW_SIZE
    );

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

  const openSearch = () => {
    setSearchOpen(true);
    setFocusArea("search");
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setFocusArea("search");

    pageRef.current?.focus();
  };

  /*
   * =========================================================
   * TRAILER
   * =========================================================
   */

  

  const openTrailer =
  async () => {
    const trailerValue =
      movieInfo
        ?.youtubeTrailer
        ?.trim() ??
      "";

    if (!trailerValue) {
      console.warn(
        "BONO Trailer unavailable"
      );

      return;
    }

    console.log(
      "BONO Trailer value:",
      trailerValue
    );

    try {
      await openNativeYouTube(
        trailerValue
      );

      console.log(
        "BONO YouTube launched"
      );
    } catch (error) {
      console.error(
        "BONO Trailer open failed:",
        error
      );
    }
  };

  /*
   * =========================================================
   * OPEN MOVIE DETAILS
   * =========================================================
   */

  const openMovieDetails = async (
    movie: MovieItem
  ) => {
    setSelectedMovie(movie);
    setMovieInfo(null);
    setMovieInfoError("");
    setMovieInfoLoading(true);
    setDetailsAction(0);
    setFocusArea("details");

    try {
      const info =
        await getMovieInfo(
          "326498",
          movie.id
        );

      setMovieInfo(info);
    } catch (error) {
      console.error(
        "BONO Movie info failed:",
        error
      );

      setMovieInfoError(
        "Movie information is unavailable."
      );
    } finally {
      setMovieInfoLoading(false);
    }
  };

  /*
   * =========================================================
   * BACK NAVIGATION
   *
   * Full Screen
   *      ↓
   * Details
   *      ↓
   * Movies
   *      ↓
   * Categories
   *      ↓
   * Home
   * =========================================================
   */

  const handleMoviesBack =
    useCallback(() => {
      /*
       * DETAILS -> MOVIES
       */
      if (
        focusArea === "details"
      ) {
        setSelectedMovie(null);
        setMovieInfo(null);
        setMovieInfoError("");
        setMovieInfoLoading(false);
        setDetailsAction(0);
        setFocusArea("movies");

        pageRef.current?.focus();
        return;
      }

      /*
       * CLOSE SEARCH KEYBOARD
       */
      if (searchOpen) {
        setSearchOpen(false);

        pageRef.current?.focus();
        return;
      }

      /*
       * SEARCH -> CATEGORIES
       */
      if (
        focusArea === "search"
      ) {
        setSearchQuery("");
        setFocusedMovie(0);
        setFocusArea("categories");

        pageRef.current?.focus();
        return;
      }

      /*
       * MOVIES -> CATEGORIES
       */
      if (
        focusArea === "movies"
      ) {
        setFocusArea("categories");

        pageRef.current?.focus();
        return;
      }

      /*
       * CATEGORIES -> HOME
       */
      if (
        focusArea === "categories"
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
   * ANDROID BACK EVENT
   * =========================================================
   */

  useEffect(() => {
    const handleBonoBack = () => {
      handleMoviesBack();
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
  }, [handleMoviesBack]);

  /*
   * =========================================================
   * REMOTE NAVIGATION
   * =========================================================
   */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    /*
     * SEARCH INPUT IS OPEN
     */
    if (searchOpen) {
      const key = event.key;
      const code = event.keyCode;

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

        setSearchOpen(false);
        setFocusedMovie(0);
        setFocusArea("movies");

        pageRef.current?.focus();
        return;
      }

      /*
       * Let Android keyboard type normally.
       */
      return;
    }

    const key = event.key;
    const code = event.keyCode;

    const left =
      key === "ArrowLeft" ||
      key === "Left" ||
      code === 37;

    const right =
      key === "ArrowRight" ||
      key === "Right" ||
      code === 39;

    const up =
      key === "ArrowUp" ||
      key === "Up" ||
      code === 38;

    const down =
      key === "ArrowDown" ||
      key === "Down" ||
      code === 40;

    const enter =
      key === "Enter" ||
      key === "OK" ||
      code === 13;

    const back =
      key === "Escape" ||
      key === "Esc" ||
      key === "Backspace" ||
      code === 4;

    /*
     * =======================================================
     * LEFT
     * =======================================================
     */

    if (left) {
      event.preventDefault();

      if (
        focusArea ===
        "details"
      ) {
        setDetailsAction(0);
        return;
      }

      if (
        focusArea === "search"
      ) {
        setFocusArea(
          "categories"
        );

        return;
      }

      if (
        focusArea === "movies"
      ) {
        setFocusedMovie(
          (current) => {
            /*
             * FIRST COLUMN
             * -> CATEGORIES
             */
            if (
              current %
                MOVIES_PER_ROW ===
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
     * =======================================================
     * RIGHT
     * =======================================================
     */

    if (right) {
      event.preventDefault();

      if (
        focusArea ===
        "details"
      ) {
        setDetailsAction(1);
        return;
      }

      /*
       * CATEGORIES -> MOVIES
       */
      if (
        focusArea === "categories"
      ) {
        setSelectedCategory(
          focusedCategory
        );

        setFocusedMovie(0);
        setFocusArea("movies");

        return;
      }

      /*
       * MOVIES
       */
      if (
        focusArea === "movies"
      ) {
        setFocusedMovie(
          (current) => {
            const isLastColumn =
              current %
                MOVIES_PER_ROW ===
              MOVIES_PER_ROW - 1;

            const isLastMovie =
              current >=
              visibleMovies.length - 1;

            if (
              isLastColumn ||
              isLastMovie
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
     * =======================================================
     * UP
     * =======================================================
     */

    if (up) {
      event.preventDefault();

      /*
       * CATEGORIES
       */
      if (
        focusArea === "categories"
      ) {
        /*
         * ALL -> SEARCH
         */
        if (
          focusedCategory === 0
        ) {
          setFocusArea("search");
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

      /*
       * MOVIES
       */
      if (
        focusArea === "movies"
      ) {
        /*
         * FIRST ROW -> SEARCH
         */
        if (
          focusedMovie <
          MOVIES_PER_ROW
        ) {
          setFocusArea("search");
          return;
        }

        setFocusedMovie(
          (current) =>
            Math.max(
              0,
              current -
                MOVIES_PER_ROW
            )
        );

        return;
      }

      return;
    }

    /*
     * =======================================================
     * DOWN
     * =======================================================
     */

    if (down) {
      event.preventDefault();

      /*
       * SEARCH -> MOVIES
       */
      if (
        focusArea === "search"
      ) {
        setFocusArea("movies");
        setFocusedMovie(0);

        return;
      }

      /*
       * CATEGORIES
       */
      if (
        focusArea === "categories"
      ) {
        setFocusedCategory(
          (current) =>
            Math.min(
              categories.length - 1,
              current + 1
            )
        );

        return;
      }

      /*
       * MOVIES
       */
      if (
        focusArea === "movies"
      ) {
        setFocusedMovie(
          (current) => {
            const next =
              current +
              MOVIES_PER_ROW;

            if (
              next <
              visibleMovies.length
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
     * =======================================================
     * ENTER / OK
     * =======================================================
     */

    if (enter) {
      event.preventDefault();

      /*
       * DETAILS ACTIONS
       */
      if (
        focusArea ===
          "details" &&
        selectedMovie
      ) {
        if (
          detailsAction ===
          0
        ) {
          void playNativeFullscreen({
            streamUrl:
              selectedMovie.streamUrl,

            contentType:
              "movie",

            contentId:
              String(
                selectedMovie.id
              ),

            title:
              movieInfo?.title ||
              selectedMovie.title,
          });

          return;
        }

        if (
          detailsAction ===
          1
        ) {
          void openTrailer();

          return;
        }
      }

      /*
       * SEARCH
       */
      if (
        focusArea === "search"
      ) {
        openSearch();
        return;
      }

      /*
       * CATEGORY -> MOVIES
       */
      if (
        focusArea === "categories"
      ) {
        setSelectedCategory(
          focusedCategory
        );

        setFocusedMovie(0);
        setFocusArea("movies");

        return;
      }

      /*
       * MOVIE -> DETAILS
       */
      if (
        focusArea === "movies"
      ) {
        const movie =
          visibleMovies[
            focusedMovie
          ];

        if (movie) {
          void openMovieDetails(movie);
        }

        return;
      }
    }

    /*
     * =======================================================
     * BACK
     * =======================================================
     */

    if (back) {
      event.preventDefault();

      handleMoviesBack();
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
      className="movies-page"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="movies-header">
        <div className="movies-brand">
          BONO
        </div>

        <h1>
          Movies
        </h1>

        <div
          className={`movies-search-button ${
            focusArea === "search"
              ? "is-focused"
              : ""
          }`}
        >
          <span className="movies-search-symbol">
            ⌕
          </span>

          <div className="movies-search-copy">
            <span>
              SEARCH
            </span>

            <strong>
              {searchQuery ||
                "Search movies"}
            </strong>
          </div>
        </div>
      </header>

      {/* =====================================================
          SEARCH OVERLAY
      ===================================================== */}

      {searchOpen && (
        <div className="movies-search-overlay">
          <div className="movies-search-box">
            <span className="movies-search-icon">
              ⌕
            </span>

            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(
                  event.target.value
                );

                setFocusedMovie(0);
              }}
              placeholder="Search movies..."
              autoComplete="off"
              spellCheck={false}
            />

            <span className="movies-search-count">
              {visibleMovies.length}
            </span>
          </div>
        </div>
      )}

      {/* =====================================================
          MOVIE DETAILS - FULL SCREEN
      ===================================================== */}

      {selectedMovie && (
        <section
          className="movie-details-fullscreen"
          style={{
            backgroundImage: (
              movieInfo?.backdrop ||
              movieInfo?.poster ||
              selectedMovie.poster
            )
              ? `url("${
                  movieInfo?.backdrop ||
                  movieInfo?.poster ||
                  selectedMovie.poster
                }")`
              : undefined,
          }}
        >
          <div className="movie-details-background-glow" />

          <div className="movie-details-full-layout">
            <div className="movie-details-full-poster">
              {(
                movieInfo?.poster ||
                selectedMovie.poster
              ) ? (
                <img
                  src={
                    movieInfo?.poster ||
                    selectedMovie.poster
                  }
                  alt=""
                />
              ) : (
                <span>
                  {selectedMovie.title
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="movie-details-full-content">
              <span className="movie-details-eyebrow">
                MOVIE
              </span>

              <h2>
                {movieInfo?.title ||
                  selectedMovie.title}
              </h2>

              <div className="movie-details-badges">
                {(movieInfo?.rating ||
                  selectedMovie.rating) && (
                  <span className="movie-detail-rating">
                    ★{" "}
                    {movieInfo?.rating ||
                      selectedMovie.rating}
                  </span>
                )}

                {movieInfo?.year && (
                  <span>
                    {movieInfo.year}
                  </span>
                )}

                <span>
                  {movieInfo?.genre ||
                    selectedMovie.category}
                </span>

                {movieInfo?.duration && (
                  <span>
                    {movieInfo.duration}
                  </span>
                )}
              </div>

              <p className="movie-details-plot">
                {movieInfoLoading
                  ? "Loading movie information..."
                  : movieInfoError ||
                    movieInfo?.plot ||
                    "No description available for this movie."}
              </p>

              <div className="movie-details-info-grid">
                <div className="movie-detail-info">
                  <span className="movie-detail-info-label">
                    RELEASE DATE
                  </span>
                  <strong>
                    {movieInfo?.releaseDate ||
                      movieInfo?.year ||
                      "—"}
                  </strong>
                </div>

                <div className="movie-detail-info">
                  <span className="movie-detail-info-label">
                    DURATION
                  </span>
                  <strong>
                    {movieInfo?.duration ||
                      "—"}
                  </strong>
                </div>

                <div className="movie-detail-info">
                  <span className="movie-detail-info-label">
                    DIRECTOR
                  </span>
                  <strong>
                    {movieInfo?.director ||
                      "—"}
                  </strong>
                </div>

                <div className="movie-detail-info">
                  <span className="movie-detail-info-label">
                    CAST
                  </span>
                  <strong>
                    {movieInfo?.cast ||
                      "—"}
                  </strong>
                </div>

                <div className="movie-detail-info">
                  <span className="movie-detail-info-label">
                    GENRE
                  </span>
                  <strong>
                    {movieInfo?.genre ||
                      selectedMovie.category}
                  </strong>
                </div>
              </div>

              <div className="movie-details-actions">
                <button
                  type="button"
                  tabIndex={-1}
                  className={`movie-details-action movie-details-play ${
                    detailsAction === 0
                      ? "is-focused"
                      : ""
                  }`}
                >
                  <span className="movie-details-action-icon">
                    ▶
                  </span>

                  <span>
                    PLAY
                  </span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-disabled={
                    !movieInfo
                      ?.youtubeTrailer
                  }
                  className={`movie-details-action movie-details-trailer ${
                    detailsAction === 1
                      ? "is-focused"
                      : ""
                  } ${
                    !movieInfo
                      ?.youtubeTrailer
                      ? "is-disabled"
                      : ""
                  }`}
                >
                  <span className="movie-details-action-icon">
                    ▣
                  </span>

                  <span>
                    TRAILER
                  </span>
                </button>

                <div className="movie-details-return">
                  BACK&nbsp;&nbsp;Return
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <section className="movies-layout">

        {/* ===================================================
            CATEGORIES
        =================================================== */}

        <aside className="movies-categories">
          <div className="movies-column-title">
            Categories
          </div>

          {categories.map(
            (category, index) => (
              <div
                key={
                  category.category_id
                }
                ref={(element) => {
                  categoryRefs.current[
                    index
                  ] = element;
                }}
                className={`movies-category ${
                  focusArea ===
                    "categories" &&
                  focusedCategory ===
                    index
                    ? "is-focused"
                    : ""
                }`}
              >
                <span className="movies-category-name">
                  {
                    category.category_name
                  }
                </span>

                <strong className="movies-category-count">
                  {
                    getMovieCategoryCount(
                      category.category_id
                    )
                  }
                </strong>
              </div>
            )
          )}
        </aside>

        {/* ===================================================
            MOVIES GRID
        =================================================== */}

        <section className="movies-grid">
          {renderedMovies.length >
          0 ? (
            renderedMovies.map(
              (movie, index) => {
                const actualIndex =
                  movieWindowStart +
                  index;

                return (
                  <div
                    key={movie.id}
                    className={`movie-card ${
                      focusArea ===
                        "movies" &&
                      focusedMovie ===
                        actualIndex
                        ? "is-focused"
                        : ""
                    }`}
                  >
                    <div className="movie-poster">
                      {movie.poster ? (
                        <img
                          src={
                            movie.poster
                          }
                          alt=""
                          loading="lazy"
                          className="movie-poster-image"
                        />
                      ) : (
                        <span>
                          {movie.title
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <strong>
                      {movie.title}
                    </strong>

                    <span>
                      {movie.category}
                    </span>
                  </div>
                );
              }
            )
          ) : (
            <div className="movies-empty">
              No movies found
            </div>
          )}
        </section>

      </section>
    </main>
  );
}

export default Movies;