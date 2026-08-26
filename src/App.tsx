import {
  useEffect,
  useState,
} from "react";

import {
  getDevicePlaylists,
} from "./services/deviceApi";

import type {
  ParsedChannel,
} from "./services/m3uParser";

import Activation from "./pages/Activation";
import Home from "./pages/Home";
import LiveTV from "./pages/LiveTV";
import Player from "./pages/player";
import Movies from "./pages/Movies";
import Series from "./pages/Series";

import {
  exitNativeApp,
} from "./services/nativePlayer";

type Screen =
  | "activation"
  | "home"
  | "liveTV"
  | "movies"
  | "series"
  | "player";

function App() {
  /*
   * =========================================================
   * BACKEND TEST
   * =========================================================
   */

  useEffect(() => {
    const testBackend = async () => {
      try {
        const result =
          await getDevicePlaylists(
            "326498"
          );

        console.log(
          "BONO Backend test:",
          result
        );
      } catch (error) {
        console.error(
          "BONO Backend connection failed:",
          error
        );
      }
    };

    void testBackend();
  }, []);

  /*
   * =========================================================
   * ACTIVATION
   * =========================================================
   */

  const isActivated =
    localStorage.getItem(
      "bonoplayer_activation_code"
    ) !== null;

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  const [
    screen,
    setScreen,
  ] = useState<Screen>(
    isActivated
      ? "home"
      : "activation"
  );

  /*
   * =========================================================
   * PLAYER STATE
   * =========================================================
   */

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
   * ANDROID BACK
   * =========================================================
   */

  useEffect(() => {
    const handleBonoBack = () => {
      /*
       * PLAYER -> LIVE TV
       */
      if (screen === "player") {
        setPlaylistChannel(null);

        setScreen("liveTV");

        return;
      }

      /*
       * LIVE TV -> HOME
       */
      if (screen === "liveTV") {
        setScreen("home");

        return;
      }

      /*
       * MOVIES
       *
       * Movies.tsx manages:
       *
       * Full Screen
       * -> Details
       * -> Movies
       * -> Categories
       * -> Home
       */
      if (screen === "movies") {
        return;
      }

      /*
       * SERIES
       *
       * Series.tsx will manage:
       *
       * VLC
       * -> Episodes
       * -> Details
       * -> Series Grid
       * -> Categories
       * -> Home
       */
      if (screen === "series") {
        return;
      }

      /*
       * HOME -> EXIT APP
       */
      if (screen === "home") {
        void exitNativeApp();

        return;
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
   * ACTIVATION SCREEN
   * =========================================================
   */

  if (
    screen === "activation"
  ) {
    return <Activation />;
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
        onBack={() =>
          setScreen("home")
        }
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
        onBack={() =>
          setScreen("home")
        }
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
        onBack={() =>
          setScreen("home")
        }
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

      onOpenLiveTV={() =>
        setScreen("liveTV")
      }

      onOpenMovies={() =>
        setScreen("movies")
      }

      onOpenSeries={() =>
        setScreen("series")
      }
    />
  );
}

export default App;