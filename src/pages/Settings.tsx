import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./Settings.css";

type SettingsProps = {
  onBack: () => void;
};

type SettingsItem = {
  id:
    | "player"
    | "language"
    | "startup"
    | "device"
    | "about";

  title: string;
  subtitle: string;
  icon: string;
};

const settingsItems: SettingsItem[] = [
  {
    id: "player",
    title: "PLAYER",
    subtitle: "Playback preferences",
    icon: "▶",
  },
  {
    id: "language",
    title: "LANGUAGE",
    subtitle: "Interface language",
    icon: "文",
  },
  {
    id: "startup",
    title: "STARTUP",
    subtitle: "Application startup behavior",
    icon: "◉",
  },
  {
    id: "device",
    title: "DEVICE",
    subtitle: "Device information",
    icon: "▣",
  },
  {
    id: "about",
    title: "ABOUT",
    subtitle: "BonoPlayer information",
    icon: "i",
  },
];

const PLAYER_KEY =
  "bonoplayer_settings_player";

const LANGUAGE_KEY =
  "bonoplayer_settings_language";

const STARTUP_KEY =
  "bonoplayer_settings_startup";

function Settings({
  onBack,
}: SettingsProps) {
  const pageRef =
    useRef<HTMLElement>(null);

  const [
    focusedIndex,
    setFocusedIndex,
  ] = useState(0);

  const [
    playerMode,
    setPlayerMode,
  ] = useState(
    () =>
      localStorage.getItem(
        PLAYER_KEY
      ) ?? "Native"
  );

  const [
    language,
    setLanguage,
  ] = useState(
    () =>
      localStorage.getItem(
        LANGUAGE_KEY
      ) ?? "English"
  );

  const [
    startupMode,
    setStartupMode,
  ] = useState(
    () =>
      localStorage.getItem(
        STARTUP_KEY
      ) ?? "Playlists"
  );

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
   * VALUES
   * =========================================================
   */

  const getItemValue = (
    item: SettingsItem
  ) => {
    if (
      item.id === "player"
    ) {
      return playerMode;
    }

    if (
      item.id === "language"
    ) {
      return language;
    }

    if (
      item.id === "startup"
    ) {
      return startupMode;
    }

    if (
      item.id === "device"
    ) {
      return "Active";
    }

    return "v0.1";
  };

  /*
   * =========================================================
   * CHANGE SETTING
   * =========================================================
   */

  const activateItem = (
    item: SettingsItem
  ) => {
    if (
      item.id === "player"
    ) {
      const nextValue =
        playerMode === "Native"
          ? "Auto"
          : "Native";

      setPlayerMode(
        nextValue
      );

      localStorage.setItem(
        PLAYER_KEY,
        nextValue
      );

      return;
    }

    if (
      item.id === "language"
    ) {
      const nextValue =
        language === "English"
          ? "Français"
          : language === "Français"
            ? "العربية"
            : "English";

      setLanguage(
        nextValue
      );

      localStorage.setItem(
        LANGUAGE_KEY,
        nextValue
      );

      return;
    }

    if (
      item.id === "startup"
    ) {
      const nextValue =
        startupMode === "Playlists"
          ? "Home"
          : "Playlists";

      setStartupMode(
        nextValue
      );

      localStorage.setItem(
        STARTUP_KEY,
        nextValue
      );
    }
  };

  /*
   * =========================================================
   * REMOTE NAVIGATION
   * =========================================================
   */

  const handleKeyDown = (
    event:
      React.KeyboardEvent<HTMLElement>
  ) => {
    const key =
      event.key;

    const keyCode =
      event.keyCode;

    const isUp =
      key === "ArrowUp" ||
      key === "Up" ||
      keyCode === 38;

    const isDown =
      key === "ArrowDown" ||
      key === "Down" ||
      keyCode === 40;

    const isLeft =
      key === "ArrowLeft" ||
      key === "Left" ||
      keyCode === 37;

    const isRight =
      key === "ArrowRight" ||
      key === "Right" ||
      keyCode === 39;

    const isEnter =
      key === "Enter" ||
      key === "OK" ||
      keyCode === 13;

    const isBack =
      key === "Escape" ||
      key === "Esc" ||
      key === "Backspace" ||
      keyCode === 8 ||
      keyCode === 27;

    /*
     * UP
     */

    if (
      isUp
    ) {
      event.preventDefault();

      setFocusedIndex(
        (current) =>
          Math.max(
            0,
            current - 1
          )
      );

      return;
    }

    /*
     * DOWN
     */

    if (
      isDown
    ) {
      event.preventDefault();

      setFocusedIndex(
        (current) =>
          Math.min(
            settingsItems.length - 1,
            current + 1
          )
      );

      return;
    }

    /*
     * LEFT / RIGHT
     *
     * Change configurable values
     * without opening another screen.
     */

    if (
      isLeft ||
      isRight
    ) {
      event.preventDefault();

      const selectedItem =
        settingsItems[
          focusedIndex
        ];

      if (
        selectedItem
      ) {
        activateItem(
          selectedItem
        );
      }

      return;
    }

    /*
     * ENTER / OK
     */

    if (
      isEnter
    ) {
      event.preventDefault();

      const selectedItem =
        settingsItems[
          focusedIndex
        ];

      if (
        selectedItem
      ) {
        activateItem(
          selectedItem
        );
      }

      return;
    }

    /*
     * BACK
     */

    if (
      isBack
    ) {
      event.preventDefault();

      onBack();
    }
  };

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main
      ref={pageRef}
      className="settings-page"
      tabIndex={0}
      onKeyDown={
        handleKeyDown
      }
    >
      <div
        className="
          settings-background-glow
          settings-glow-left
        "
      />

      <div
        className="
          settings-background-glow
          settings-glow-right
        "
      />

      {/* HEADER */}

      <header
        className="settings-header"
      >
        <div
          className="settings-brand"
        >
          <span
            className="
              settings-brand-name
            "
          >
            BONO
          </span>
        </div>

        <div
          className="settings-title"
        >
          <h1>
            SETTINGS
          </h1>
        </div>

        <button
          type="button"
          className="
            settings-back-button
          "
          aria-label="Back"
          onClick={
            onBack
          }
        >
          ←
        </button>
      </header>

      {/* CONTENT */}

      <section
        className="settings-content"
      >
        <div
          className="
            settings-section-heading
          "
        >
          <span>
            BONO PLAYER
          </span>

          <h2>
            Application Settings
          </h2>

          <p>
            Configure your
            BonoPlayer experience.
          </p>
        </div>

        <div
          className="settings-list"
        >
          {settingsItems.map(
            (
              item,
              index
            ) => (
              <button
                key={
                  item.id
                }
                type="button"
                className={`
                  settings-item
                  ${
                    focusedIndex ===
                    index
                      ? "settings-item-focused"
                      : ""
                  }
                `}
                onMouseEnter={() =>
                  setFocusedIndex(
                    index
                  )
                }
                onClick={() =>
                  activateItem(
                    item
                  )
                }
              >
                <div
                  className="
                    settings-item-icon
                  "
                >
                  {item.icon}
                </div>

                <div
                  className="
                    settings-item-copy
                  "
                >
                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {
                      item.subtitle
                    }
                  </span>
                </div>

                <div
                  className="
                    settings-item-value
                  "
                >
                  {getItemValue(
                    item
                  )}
                </div>

                <span
                  className="
                    settings-item-arrow
                  "
                >
                  ›
                </span>
              </button>
            )
          )}
        </div>

        <aside
          className="
            settings-info-panel
          "
        >
          <span>
            BONO PLAYER
          </span>

          <strong>
            Gold Edition
          </strong>

          <p>
            Designed for
            television and
            D-Pad navigation.
          </p>

          <div
            className="
              settings-status
            "
          >
            <span
              className="
                settings-status-dot
              "
            />

            Active
          </div>
        </aside>
      </section>

      {/* FOOTER */}

      <footer
        className="settings-footer"
      >
        <span>
          ↑ ↓ Navigate
        </span>

        <span>
          OK Select
        </span>

        <span>
          ← → Change
        </span>

        <span>
          BACK Return
        </span>
      </footer>
    </main>
  );
}

export default Settings;