import { useEffect, useRef, useState } from "react";
import "./Home.css";
import { channels } from "../data/channels";

type HomeProps = {
  onPlayChannel: (channelIndex: number) => void;

  // سنربط هذه الشاشات لاحقًا من App.tsx
  onOpenLiveTV?: () => void;
  onOpenMovies?: () => void;
  onOpenSeries?: () => void;
  onOpenSettings?: () => void;
};

type MainItem = {
  id: "live" | "movies" | "series";
  title: string;
  subtitle: string;
  icon: string;
};

const mainItems: MainItem[] = [
  {
    id: "live",
    title: "LIVE TV",
    subtitle: "Watch live channels",
    icon: "▣",
  },
  {
    id: "movies",
    title: "MOVIES",
    subtitle: "Explore movies",
    icon: "▶",
  },
  {
    id: "series",
    title: "SERIES",
    subtitle: "Explore series",
    icon: "▤",
  },
];

function Home({
  onPlayChannel,
  onOpenLiveTV,
  onOpenMovies,
  onOpenSeries,
  onOpenSettings,
}: HomeProps) {
  const homeRef = useRef<HTMLElement>(null);

  const [focusArea, setFocusArea] = useState<
    "recent" | "main"
  >("main");

  const [focusedMain, setFocusedMain] = useState(0);
  const [focusedRecent, setFocusedRecent] = useState(0);
  const [currentTime, setCurrentTime] = useState(
    new Date()
  );

  /*
   * =========================================================
   * DEVICE INFORMATION
   * Temporary demo values.
   * Later they will come from the real activation/device system.
   * =========================================================
   */

  const deviceId = "326498";
  const devicePin = "457961";

  /*
   * =========================================================
   * RECENTLY WATCHED
   * =========================================================
   */

  const recentlyWatched = channels.slice(0, 4);

  /*
   * =========================================================
   * INITIAL FOCUS
   * =========================================================
   */

  useEffect(() => {
    homeRef.current?.focus();
  }, []);

  /*
   * =========================================================
   * CLOCK
   * =========================================================
   */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /*
   * =========================================================
   * OPEN MAIN SECTION
   * =========================================================
   */

  const openMainItem = (item: MainItem) => {
    if (item.id === "live") {
      onOpenLiveTV?.();
      return;
    }

    if (item.id === "movies") {
      onOpenMovies?.();
      return;
    }

    if (item.id === "series") {
      onOpenSeries?.();
    }
  };

  /*
   * =========================================================
   * REMOTE NAVIGATION
   * D-PAD / OK
   * =========================================================
   */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    const key = event.key;
    const keyCode = event.keyCode;

    const isLeft =
      key === "ArrowLeft" ||
      key === "Left" ||
      keyCode === 37;

    const isRight =
      key === "ArrowRight" ||
      key === "Right" ||
      keyCode === 39;

    const isUp =
      key === "ArrowUp" ||
      key === "Up" ||
      keyCode === 38;

    const isDown =
      key === "ArrowDown" ||
      key === "Down" ||
      keyCode === 40;

    const isEnter =
      key === "Enter" ||
      key === "OK" ||
      keyCode === 13;
/*
 * ================= LEFT =================
 */

if (isLeft) {
  event.preventDefault();

  if (focusArea === "main") {
    setFocusedMain((current) =>
      Math.max(0, current - 1)
    );
  }

  if (focusArea === "recent") {
    setFocusedRecent((current) =>
      Math.max(0, current - 1)
    );
  }

  return;
}

/*
 * ================= RIGHT =================
 */

if (isRight) {
  event.preventDefault();

  if (focusArea === "main") {
    setFocusedMain((current) =>
      Math.min(
        mainItems.length - 1,
        current + 1
      )
    );
  }

  if (focusArea === "recent") {
    setFocusedRecent((current) =>
      Math.min(
        recentlyWatched.length - 1,
        current + 1
      )
    );
  }

  return;
}

/*
 * ================= UP =================
 */

if (isUp) {
  event.preventDefault();

  if (
    focusArea === "main" &&
    recentlyWatched.length > 0
  ) {
    setFocusArea("recent");
  }

  return;
}

/*
 * ================= DOWN =================
 */

if (isDown) {
  event.preventDefault();

  if (focusArea === "recent") {
    setFocusArea("main");
  }

  return;
}

/*
 * ================= ENTER / OK =================
 */

if (isEnter) {
  event.preventDefault();

  if (focusArea === "recent") {
    const selectedRecent =
      recentlyWatched[focusedRecent];

    if (selectedRecent) {
      const channelIndex = channels.findIndex(
        (channel) =>
          channel.id === selectedRecent.id
      );

      if (channelIndex !== -1) {
        onPlayChannel(channelIndex);
      }
    }

    return;
  }

  if (focusArea === "main") {
    const selectedItem =
      mainItems[focusedMain];

    if (selectedItem) {
      openMainItem(selectedItem);
    }
  }

  return;
}
    /*
     * ================= BACK =================
     */

    if (
      key === "Escape" ||
      key === "Esc" ||
      key === "Backspace"
    ) {
      event.preventDefault();
    }
  };

  return (
    <main
      ref={homeRef}
      className="home-page"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}

      <div className="home-background-glow glow-left" />
      <div className="home-background-glow glow-right" />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="home-header">
        <div className="home-brand">
          <span className="home-brand-name">
            BONO
          </span>
        </div>

        <div className="home-top-info">
          <div className="home-clock">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <button
            className="home-top-button"
            type="button"
            aria-label="Search"
          >
            ⌕
          </button>

          <button
            className="home-top-button"
            type="button"
            aria-label="Settings"
            onClick={() => onOpenSettings?.()}
          >
            ⚙
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="home-content">
        {/* ===================================================
            RECENTLY WATCHED
        =================================================== */}

        <section className="home-recent-section">
          <div className="home-section-title">
            <div>
              <span>CONTINUE WATCHING</span>
              <h2>Recently Watched</h2>
            </div>

            <span className="home-section-count">
              {recentlyWatched.length}
            </span>
          </div>

          <div className="recent-row">
            {recentlyWatched.map(
              (channel, index) => (
                <button
                  key={channel.id}
                  type="button"
                  className={`recent-item ${
                    focusArea === "recent" &&
                    focusedRecent === index  
                      ? "recent-item-focused"
                      : ""
                  }`}
                  onClick={() => {
                    const globalIndex =
                      channels.findIndex(
                        (item) =>
                          item.id === channel.id
                      );

                    if (globalIndex !== -1) {
                      onPlayChannel(globalIndex);
                    }
                  }}
                >
                  <div className="recent-item-logo">
                    {channel.logo}
                  </div>

                  <div className="recent-item-overlay">
                    <strong>{channel.name}</strong>

                    <span>
                      {channel.category}
                    </span>
                  </div>

                  <div className="recent-item-play">
                    ▶
                  </div>
                </button>
              )
            )}
          </div>
        </section>

        {/* ===================================================
            MAIN NAVIGATION
        =================================================== */}

        <section className="home-main-section">
          <div className="home-section-title">
            <div>
              <span>YOUR ENTERTAINMENT</span>
              <h2>Explore Bono</h2>
            </div>
          </div>

          <div className="main-card-grid">
            {mainItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`main-card main-card-${item.id} ${
                  focusArea === "main" &&
                  focusedMain === index
                    ? "main-card-focused"
                    : ""
                }`}
                onMouseEnter={() => {
                  setFocusedMain(index);
                  setFocusArea("main");
                }}
                onClick={() =>
                  openMainItem(item)
                }
              >
                <div className="main-card-content">
                  <div className="main-card-icon">
                    {item.icon}
                  </div>

                  <div className="main-card-copy">
                    <span>{item.subtitle}</span>

                    <strong>{item.title}</strong>
                  </div>
                </div>

                <span className="main-card-arrow">
                  ›
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>

      {/* =====================================================
          DEVICE INFO
      ===================================================== */}

      <section className="device-info-bar">
        <div className="device-info-left">
          <div className="device-info-item">
            <span>DEVICE ID</span>

            <strong>{deviceId}</strong>
          </div>

          <div className="device-info-separator" />

          <div className="device-info-item">
            <span>DEVICE PIN</span>

            <strong>{devicePin}</strong>
          </div>
        </div>

        <div className="device-info-right">
          <div className="device-status">
            <span className="device-status-dot" />

            <div>
              <span>STATUS</span>
              <strong>Active</strong>
            </div>
          </div>

          <span className="home-version">
            BONO • v0.1
          </span>
        </div>
      </section>

      {/* =====================================================
          REMOTE HELP
      ===================================================== */}

      <footer className="home-footer">
        <div>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd>
          <span>Navigate</span>
        </div>

        <div>
          <kbd>OK</kbd>
          <span>Select</span>
        </div>

        <div>
          <kbd>BACK</kbd>
          <span>Back</span>
        </div>
      </footer>
    </main>
  );
}

export default Home;