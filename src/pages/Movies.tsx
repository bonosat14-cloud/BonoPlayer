import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  playNativeFullscreen,
} from "../services/nativePlayer";

import {
  getMovieCategories,
  getMovies,
} from "../services/moviesService";

import type {
  MovieCategory,
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
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

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
       * DETAILS -> VLC FULL SCREEN
       */
      if (
        focusArea === "details" &&
        selectedMovie
      ) {
        void playNativeFullscreen(
          selectedMovie.streamUrl
        );

        return;
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
          setSelectedMovie(movie);
          setFocusArea("details");
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
          MOVIE DETAILS
      ===================================================== */}

      {selectedMovie && (
        <div className="movie-details-overlay">
          <div className="movie-details-card">

            <div className="movie-details-poster">
              {selectedMovie.poster ? (
                <img
                  src={
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

            <div className="movie-details-content">
              <span className="movie-details-label">
                MOVIE
              </span>

              <h2>
                {selectedMovie.title}
              </h2>

              <div className="movie-details-meta">
                <span>
                  {selectedMovie.category}
                </span>

                {selectedMovie.year && (
                  <span>
                    {selectedMovie.year}
                  </span>
                )}

                {selectedMovie.rating && (
                  <span>
                    ★ {selectedMovie.rating}
                  </span>
                )}
              </div>

              <p>
                Movie information will appear
                here when extended VOD metadata
                is connected.
              </p>

              <button
                type="button"
                className="movie-details-play is-focused"
              >
                ▶ PLAY
              </button>

              <span className="movie-details-hint">
                OK Play • BACK Return
              </span>
            </div>

          </div>
        </div>
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
                {
                  category.category_name
                }
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