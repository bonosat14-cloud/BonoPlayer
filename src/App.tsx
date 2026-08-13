import { useState } from "react";
import Activation from "./pages/Activation";
import Home from "./pages/Home";
import Player from "./pages/Player";

type Screen = "activation" | "home" | "player";

function App() {
  const isActivated =
    localStorage.getItem("bonoplayer_activation_code") !== null;

  const [screen, setScreen] = useState<Screen>(
    isActivated ? "home" : "activation"
  );

  const [selectedChannel, setSelectedChannel] = useState(0);

  if (screen === "activation") {
    return <Activation />;
  }

  if (screen === "player") {
    return (
      <Player
        channelIndex={selectedChannel}
        onBack={() => setScreen("home")}
      />
    );
  }

  return (
    <Home
      onPlayChannel={(channelIndex) => {
        setSelectedChannel(channelIndex);
        setScreen("player");
      }}
    />
  );
}

export default App;