import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getDevicePlaylists,
} from "../services/xtreamService";

import type {
  DevicePlaylist,
} from "../services/xtreamService";

import "./Playlists.css";

type PlaylistsProps = {
  selectedPlaylistId:
    string | null;

  onSelectPlaylist: (
    playlistId: string
  ) => void;
};

function Playlists({
  selectedPlaylistId,
  onSelectPlaylist,
}: PlaylistsProps) {
  const pageRef =
    useRef<HTMLElement>(null);

  const [
    playlists,
    setPlaylists,
  ] = useState<
    DevicePlaylist[]
  >([]);

  const [
    focusedIndex,
    setFocusedIndex,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPlaylists =
      async () => {
        setLoading(true);
        setError("");

        try {
          const result =
            await getDevicePlaylists(
              "326498"
            );

          if (cancelled) {
            return;
          }

          setPlaylists(result);

          const savedIndex =
            result.findIndex(
              (playlist) =>
                playlist.id ===
                selectedPlaylistId
            );

          setFocusedIndex(
            savedIndex >= 0
              ? savedIndex
              : 0
          );
        } catch (loadError) {
          console.error(
            "BONO playlists screen load failed:",
            loadError
          );

          if (!cancelled) {
            setError(
              "Unable to load playlists."
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [
    selectedPlaylistId,
  ]);

  useEffect(() => {
    pageRef.current?.focus();
  }, []);

  const focusedPlaylist =
    useMemo(
      () =>
        playlists[
          focusedIndex
        ] ?? null,
      [
        playlists,
        focusedIndex,
      ]
    );

  const handleKeyDown = (
    event:
      React.KeyboardEvent<HTMLElement>
  ) => {
    const key =
      event.key;

    const code =
      event.keyCode;

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

    if (up) {
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

    if (down) {
      event.preventDefault();

      setFocusedIndex(
        (current) =>
          Math.min(
            Math.max(
              0,
              playlists.length - 1
            ),
            current + 1
          )
      );

      return;
    }

    if (enter) {
      event.preventDefault();

      if (focusedPlaylist) {
        onSelectPlaylist(
          focusedPlaylist.id
        );
      }
    }
  };

  return (
    <main
      ref={pageRef}
      className="playlists-page"
      tabIndex={0}
      onKeyDown={
        handleKeyDown
      }
    >
      <header className="playlists-header">
        <div className="playlists-brand">
          BONO
        </div>

        <div className="playlists-header-copy">
          <span>
            PLAYER
          </span>

          <strong>
            Select Playlist
          </strong>
        </div>
      </header>

      <section className="playlists-content">
        <div className="playlists-title-block">
          <span>
            PLAYLISTS
          </span>

          <h1>
            Playlist Uploaded
          </h1>

          <p>
            Choose a playlist to continue.
          </p>
        </div>

        {loading && (
          <div className="playlists-status">
            Loading playlists...
          </div>
        )}

        {!loading &&
          error && (
          <div className="playlists-status is-error">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          playlists.length ===
            0 && (
          <div className="playlists-status">
            No playlists available.
          </div>
        )}

        {!loading &&
          !error &&
          playlists.length >
            0 && (
          <div className="playlists-list">
            {playlists.map(
              (
                playlist,
                index
              ) => {
                const focused =
                  index ===
                  focusedIndex;

                const selected =
                  playlist.id ===
                  selectedPlaylistId;

                return (
                  <div
                    key={
                      playlist.id
                    }
                    className={`playlist-card ${
                      focused
                        ? "is-focused"
                        : ""
                    } ${
                      selected
                        ? "is-selected"
                        : ""
                    }`}
                  >
                    <div className="playlist-card-icon">
                      <span>
                        {playlist.type ===
                        "xtream"
                          ? "X"
                          : "M"}
                      </span>
                    </div>

                    <div className="playlist-card-copy">
                      <span className="playlist-card-label">
                        Playlist Uploaded
                      </span>

                      <strong>
                        {playlist.name}
                      </strong>

                      <span className="playlist-card-type">
                        {playlist.type ===
                        "xtream"
                          ? "Xtream Codes"
                          : "M3U Playlist"}
                      </span>
                    </div>

                    <div className="playlist-card-side">
                      {selected && (
                        <span className="playlist-selected-badge">
                          ACTIVE
                        </span>
                      )}

                      <span className="playlist-card-arrow">
                        ›
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      <footer className="playlists-footer">
        <span>
          ↑ ↓ Navigate
        </span>

        <span>
          OK Select
        </span>

        <span>
          BACK Exit
        </span>
      </footer>
    </main>
  );
}

export default Playlists;
