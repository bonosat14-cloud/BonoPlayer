import { useEffect, useState } from "react";
import { getDevicePlaylists } from "./services/deviceApi";
import type { ParsedChannel } from "./services/m3uParser";

import Activation from "./pages/Activation";
import Home from "./pages/Home";
import LiveTV from "./pages/LiveTV";
import Player from "./pages/player";

import { exitNativeApp } from "./services/nativePlayer";

type Screen =
  | "activation"
  | "home"
  | "liveTV"
  | "player";

function App() {
  useEffect(() => {
    const testBackend = async () => {
      try {
        const result = await getDevicePlaylists("326498");

        console.log("BONO Backend test:", result);
      } catch (error) {
        console.error(
          "BONO Backend connection failed:",
          error
        );
      }
    };

    void testBackend();
  }, []);

  const isActivated =
    localStorage.getItem("bonoplayer_activation_code") !== null;

  const [screen, setScreen] = useState<Screen>(
    isActivated ? "home" : "activation"
  );

  const [selectedChannel, setSelectedChannel] = useState(0);

  const [playlistChannel, setPlaylistChannel] =
    useState<ParsedChannel | null>(null);
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
  if (screen === "activation") {
    return <Activation />;
  }

  if (screen === "player") {
    return (
      <Player
        channelIndex={selectedChannel}
        playlistChannel={playlistChannel}
        onBack={() => {
          setPlaylistChannel(null);
          setScreen("liveTV");
        }}
      />
    );
  }

  if (screen === "liveTV") {
    return (
      <LiveTV
        onBack={() => setScreen("home")}
        onPlayChannel={(channelIndex) => {
          setPlaylistChannel(null);
          setSelectedChannel(channelIndex);
          setScreen("player");
        }}
        onPlayPlaylistChannel={(channel) => {
          setPlaylistChannel(channel);
          setScreen("player");
        }}
      />
    );
  }

  return (
    <Home
      onPlayChannel={(channelIndex) => {
        setPlaylistChannel(null);
        setSelectedChannel(channelIndex);
        setScreen("player");
      }}
      onOpenLiveTV={() => setScreen("liveTV")}
    />
  );
}

export default App;