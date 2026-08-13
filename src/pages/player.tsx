import { useEffect, useRef, useState } from "react";
import "./Player.css";
import { channels } from "../data/channels";

type PlayerProps = {
  channelIndex: number;
  onBack: () => void;
};

function Player({ channelIndex, onBack }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentChannel, setCurrentChannel] = useState(channelIndex);
  const [playing, setPlaying] = useState(true);
  const [showChannels, setShowChannels] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);

  const channel = channels[currentChannel];

  useEffect(() => {
    setCurrentChannel(channelIndex);
  }, [channelIndex]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.volume = volume;

    const playVideo = async () => {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };

    playVideo();
  }, [currentChannel, volume]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowControls(false);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentChannel, showControls]);

  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }

    setShowControls(true);
  };

  const changeChannel = (direction: number) => {
    let next = currentChannel + direction;

    if (next < 0) {
      next = channels.length - 1;
    }

    if (next >= channels.length) {
      next = 0;
    }

    setCurrentChannel(next);
    setShowControls(true);
  };

  const toggleFullscreen = async () => {
    const player = document.querySelector(
      ".player-page"
    ) as HTMLElement | null;

    if (!player) return;

    try {
      if (!document.fullscreenElement) {
        await player.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may not be supported.
    }

    setShowControls(true);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        changeChannel(1);
        break;

      case "ArrowDown":
        event.preventDefault();
        changeChannel(-1);
        break;

      case "ArrowLeft":
        event.preventDefault();
        setShowChannels(true);
        setShowControls(true);
        break;

      case "ArrowRight":
        event.preventDefault();
        setShowControls(true);
        break;

      case "Enter":
        event.preventDefault();
        togglePlay();
        break;

      case "Escape":
        event.preventDefault();

        if (showChannels) {
          setShowChannels(false);
          return;
        }

        onBack();
        break;

      case "f":
      case "F":
        toggleFullscreen();
        break;

      case "m":
      case "M": {
        const video = videoRef.current;

        if (!video) break;

        video.muted = !video.muted;
        setShowControls(true);
        break;
      }

      default:
        break;
    }
  };

  if (!channel) {
    return (
      <main className="player-page">
        <div
          style={{
            color: "white",
            padding: "40px",
            fontSize: "24px",
          }}
        >
          Channel not found
        </div>
      </main>
    );
  }

  return (
    <main
      className="player-page"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        className="player-video"
        src={channel.streamUrl}
        autoPlay
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="player-overlay" />

      <header className="player-topbar">
        <div className="player-channel-info">
          <div className="player-channel-logo">
            {channel.logo}
          </div>

          <div>
            <strong>{channel.name}</strong>
            <span>{channel.category}</span>
          </div>
        </div>

        <div className="player-live">
          <span />
          LIVE
        </div>
      </header>

      {showChannels && (
        <aside className="player-channel-menu">
          <div className="menu-title">
            <span>CHANNELS</span>
            <small>↑ ↓</small>
          </div>

          <div className="menu-list">
            {channels.map((item, index) => (
              <button
                key={item.id}
                className={`menu-channel ${
                  index === currentChannel
                    ? "menu-channel-active"
                    : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  setCurrentChannel(index);
                  setShowChannels(false);
                  setShowControls(true);
                }}
              >
                <span className="menu-logo">
                  {item.logo}
                </span>

                <span className="menu-channel-name">
                  {item.name}
                </span>

                {index === currentChannel && (
                  <span className="menu-playing">
                    NOW
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>
      )}

      {showControls && (
        <div className="player-controls">
          <div className="player-control-row">
            <button
              className="player-control-button"
              onClick={() => changeChannel(-1)}
            >
              ◀
            </button>

            <button
              className="player-control-button player-play"
              onClick={togglePlay}
            >
              {playing ? "Ⅱ" : "▶"}
            </button>

            <button
              className="player-control-button"
              onClick={() => changeChannel(1)}
            >
              ▶
            </button>

            <div className="player-volume">
              <span>🔊</span>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => {
                  const value = Number(
                    event.target.value
                  );

                  setVolume(value);

                  if (videoRef.current) {
                    videoRef.current.volume = value;
                  }
                }}
              />
            </div>

            <button
              className="player-control-button fullscreen-button"
              onClick={toggleFullscreen}
            >
              ⛶
            </button>
          </div>

          <div className="player-control-info">
            <span>↑ ↓ Channel</span>
            <span>ENTER Play / Pause</span>
            <span>← Channels</span>
            <span>ESC Back</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default Player;