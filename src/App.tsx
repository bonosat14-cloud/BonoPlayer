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

  useEffect(() => {
    const handleBonoBack = () => {
      if (screen === "player") {
        setPlaylistChannel(null);
        setScreen("liveTV");
        return;
      }

      if (screen === "liveTV") {
        setScreen("home");
        return;
      }

      if (
        screen === "movies" ||
        screen === "series"
      ) {
        return;
      }

      if (screen === "home") {
        setScreen("playlists");
        return;
      }

      if (screen === "playlists") {
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

  if (
    screen === "activation"
  ) {
    return <Activation />;
  }

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
