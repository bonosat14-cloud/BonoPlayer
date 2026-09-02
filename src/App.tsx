import {
  useEffect,
  useState,
} from "react";

import type {
  ParsedChannel,
} from "./services/m3uParser";

import Activation from "./pages/Activation";
import Playlists from "./pages/playlists";
import Home from "./pages/Home";
import LiveTV from "./pages/LiveTV";
import Player from "./pages/player";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import Settings from "./pages/Settings";

import {
  exitNativeApp,
} from "./services/nativePlayer";

const SELECTED_PLAYLIST_KEY =
  "bonoplayer_selected_playlist";

type Screen =
  | "activation"
  | "playlists"
  | "home"
  | "liveTV"
  | "movies"
  | "series"
  | "settings"
  | "player";

function App() {
  const isActivated =
    localStorage.getItem(
      "bonoplayer_activation_code"
    ) !== null;

  const [
    screen,
    setScreen,
  ] = useState<Screen>(
    isActivated
      ? "playlists"
      : "activation"
  );

  const [
    selectedPlaylistId,
    setSelectedPlaylistId,
  ] = useState<string | null>(
    () =>
      localStorage.getItem(
        SELECTED_PLAYLIST_KEY
      )
  );

  const [
    selectedChannel,
    setSelectedChannel,
  ] = useState(0);

  const [
    playlistChannel,
    setPlaylistChannel,
  ] =
    useState<ParsedChannel | null>(
      null
    );

  /*
   * =========================================================
   * GLOBAL TV BACK
   * =========================================================
   */

  useEffect(() => {
    const handleBonoBack = () => {
      /*
       * PLAYER -> LIVE TV
       */

      if (
        screen === "player"
      ) {
        setPlaylistChannel(
          null
        );

        setScreen(
          "liveTV"
        );

        return;
      }

      /*
       * LIVE TV -> HOME
       */

      if (
        screen === "liveTV"
      ) {
        setScreen(
          "home"
        );

        return;
      }

      /*
       * SETTINGS -> HOME
       */

      if (
        screen === "settings"
      ) {
        setScreen(
          "home"
        );

        return;
      }

      /*
       * Movies and Series
       * handle BACK internally.
       */

      if (
        screen === "movies" ||
        screen === "series"
      ) {
        return;
      }

      /*
       * HOME -> PLAYLISTS
       */

      if (
        screen === "home"
      ) {
        setScreen(
          "playlists"
        );

        return;
      }

      /*
       * PLAYLISTS -> EXIT APP
       */

      if (
        screen === "playlists"
      ) {
        void exitNativeApp();
      }
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
  }, [screen]);

  /*
   * =========================================================
   * ACTIVATION
   * =========================================================
   */

  if (
    screen === "activation"
  ) {
    return (
      <Activation />
    );
  }

  /*
   * =========================================================
   * PLAYLISTS
   * =========================================================
   */

  if (
    screen === "playlists"
  ) {
    return (
      <Playlists
        selectedPlaylistId={
          selectedPlaylistId
        }
        onSelectPlaylist={(
          playlistId
        ) => {
          localStorage.setItem(
            SELECTED_PLAYLIST_KEY,
            playlistId
          );

          setSelectedPlaylistId(
            playlistId
          );

          setPlaylistChannel(
            null
          );

          setSelectedChannel(
            0
          );

          setScreen(
            "home"
          );
        }}
      />
    );
  }

  /*
   * =========================================================
   * PLAYER
   * =========================================================
   */

  if (
    screen === "player"
  ) {
    return (
      <Player
        channelIndex={
          selectedChannel
        }
        playlistChannel={
          playlistChannel
        }
        onBack={() => {
          setPlaylistChannel(
            null
          );

          setScreen(
            "liveTV"
          );
        }}
      />
    );
  }

  /*
   * =========================================================
   * LIVE TV
   * =========================================================
   */

  if (
    screen === "liveTV"
  ) {
    return (
      <LiveTV
        onBack={() => {
          setScreen(
            "home"
          );
        }}
        onPlayChannel={(
          channelIndex
        ) => {
          setPlaylistChannel(
            null
          );

          setSelectedChannel(
            channelIndex
          );

          setScreen(
            "player"
          );
        }}
        onPlayPlaylistChannel={(
          channel
        ) => {
          setPlaylistChannel(
            channel
          );

          setScreen(
            "player"
          );
        }}
      />
    );
  }

  /*
   * =========================================================
   * MOVIES
   * =========================================================
   */

  if (
    screen === "movies"
  ) {
    return (
      <Movies
        onBack={() => {
          setScreen(
            "home"
          );
        }}
      />
    );
  }

  /*
   * =========================================================
   * SERIES
   * =========================================================
   */

  if (
    screen === "series"
  ) {
    return (
      <Series
        onBack={() => {
          setScreen(
            "home"
          );
        }}
      />
    );
  }

  /*
   * =========================================================
   * SETTINGS
   * =========================================================
   */

  if (
    screen === "settings"
  ) {
    return (
      <Settings
        onBack={() => {
          setScreen(
            "home"
          );
        }}
      />
    );
  }

  /*
   * =========================================================
   * HOME
   * =========================================================
   */

  return (
    <Home
      onPlayChannel={(
        channelIndex
      ) => {
        setPlaylistChannel(
          null
        );

        setSelectedChannel(
          channelIndex
        );

        setScreen(
          "player"
        );
      }}

      onOpenLiveTV={() => {
        setScreen(
          "liveTV"
        );
      }}

      onOpenMovies={() => {
        setScreen(
          "movies"
        );
      }}

      onOpenSeries={() => {
        setScreen(
          "series"
        );
      }}

      onOpenSettings={() => {
        setScreen(
          "settings"
        );
      }}
    />
  );
}

export default App;