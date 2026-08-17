import { playNative } from "../services/nativePlayer";
import { useEffect, useRef, useState } from "react";
import "./Player.css";
import { channels } from "../data/channels";

export type PlayerChannel = {
  id: string | number;
  name: string;
  category: string;
  logo: string;
  streamUrl: string;
};

type PlayerProps = {
  channelIndex?: number;
  playlistChannel?: PlayerChannel | null;
  onBack: () => void;
};

function Player({
  channelIndex = 0,
  playlistChannel = null,
  onBack,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLElement>(null);

  const [currentChannel, setCurrentChannel] =
    useState(channelIndex);

  const [menuIndex, setMenuIndex] =
    useState(channelIndex);

  const [playing, setPlaying] = useState(true);
  const [showChannels, setShowChannels] =
    useState(false);
  const [showControls, setShowControls] =
    useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const channel =
  playlistChannel ??
  channels[currentChannel];
useEffect(() => {
  if (!playlistChannel) {
    return;
  }

  void playNative(
    playlistChannel.streamUrl
  ).catch((error: unknown) => {
    console.error(
      "Native player failed:",
      error
    );
  });
}, [playlistChannel]);

  /* =====================================================
     UPDATE CHANNEL
     ===================================================== */

  useEffect(() => {
    setCurrentChannel(channelIndex);
    setMenuIndex(channelIndex);
  }, [channelIndex]);

  /* =====================================================
     VIDEO PLAY
     ===================================================== */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.volume = volume;
    video.muted = muted;

    const playVideo = async () => {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };

    playVideo();
}, [currentChannel, playlistChannel]);  /* =====================================================
     CONTROLS AUTO HIDE
     ===================================================== */

  useEffect(() => {
    if (!showControls) return;

    const timer = window.setTimeout(() => {
      setShowControls(false);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showControls, currentChannel]);

  /* =====================================================
     PLAY / PAUSE
     ===================================================== */

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

  /* =====================================================
     CHANGE CHANNEL
     ===================================================== */

const changeChannel = (direction: number) => {
  if (playlistChannel) {
    return;
  }

  if (channels.length === 0) return;

  let next = currentChannel + direction;

  if (next < 0) {
    next = channels.length - 1;
  }

  if (next >= channels.length) {
    next = 0;
  }

  setCurrentChannel(next);
  setMenuIndex(next);
  setShowChannels(false);
  setShowControls(true);
};
  /* =====================================================
     FULLSCREEN
     ===================================================== */

  const toggleFullscreen = async () => {
    const player = playerRef.current;

    if (!player) return;

    try {
      if (!document.fullscreenElement) {
        await player.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported
    }

    setShowControls(true);
  };

  /* =====================================================
     MUTE
     ===================================================== */

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) return;

    const nextMuted = !video.muted;

    video.muted = nextMuted;
    setMuted(nextMuted);
    setShowControls(true);
  };

  /* =====================================================
     KEYBOARD / REMOTE
     ===================================================== */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    const key = event.key;
    const keyCode = event.keyCode;

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

    /* =================================================
       CHANNEL MENU IS OPEN
       ================================================= */

    if (showChannels) {
      if (isUp) {
        event.preventDefault();
        event.stopPropagation();

        setMenuIndex((current) => {
          if (current <= 0) {
            return channels.length - 1;
          }

          return current - 1;
        });

        setShowControls(true);
        return;
      }

      if (isDown) {
        event.preventDefault();
        event.stopPropagation();

        setMenuIndex((current) => {
          if (current >= channels.length - 1) {
            return 0;
          }

          return current + 1;
        });

        setShowControls(true);
        return;
      }

      if (isEnter) {
        event.preventDefault();
        event.stopPropagation();

        setCurrentChannel(menuIndex);
        setShowChannels(false);
        setShowControls(true);

        return;
      }

      if (isLeft || isRight) {
        event.preventDefault();
        event.stopPropagation();

        setShowChannels(false);
        setShowControls(true);

        return;
      }

      if (
        key === "Escape" ||
        key === "Esc"
      ) {
        event.preventDefault();
        event.stopPropagation();

        setShowChannels(false);
        setShowControls(true);

        return;
      }

      return;
    }

    /* =================================================
       NORMAL PLAYER
       ================================================= */

    if (isUp) {
      event.preventDefault();
      event.stopPropagation();

      changeChannel(-1);
      return;
    }

    if (isDown) {
      event.preventDefault();
      event.stopPropagation();

      changeChannel(1);
      return;
    }

    if (isLeft) {
      event.preventDefault();
      event.stopPropagation();

      setMenuIndex(currentChannel);
      setShowChannels(true);
      setShowControls(true);

      return;
    }

    if (isRight) {
      event.preventDefault();
      event.stopPropagation();

      setShowControls(true);
      return;
    }

    if (
  isEnter ||
  key === " " ||
  key === "Spacebar" ||
  event.code === "Space"
) {
  event.preventDefault();
  event.stopPropagation();

  togglePlay();
  return;
}

    if (
      key === "Escape" ||
      key === "Esc"
    ) {
      event.preventDefault();
      event.stopPropagation();

      onBack();
      return;
    }

    if (
      key === "f" ||
      key === "F"
    ) {
      event.preventDefault();

      toggleFullscreen();
      return;
    }

    if (
      key === "m" ||
      key === "M"
    ) {
      event.preventDefault();

      toggleMute();
      return;
    }
  };

  /* =====================================================
     INVALID CHANNEL
     ===================================================== */

  if (!channel) {
    return (
      <main className="player-page">
        <div className="player-error">
          Channel not found
        </div>
      </main>
    );
  }

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <main
      ref={playerRef}
      className="player-page"
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
      onClick={() => setShowControls(true)}
    >
      {/* VIDEO */}

{!playlistChannel && (
  <video
    ref={videoRef}
    className="player-video"
    src={channel.streamUrl}
    autoPlay
    playsInline
    onPlay={() => setPlaying(true)}
    onPause={() => setPlaying(false)}
  />
)}

      <div className="player-overlay" />

      {/* =================================================
         TOP BAR
         ================================================= */}

      <header className="player-topbar">
        <div className="player-channel-info">
          <div className="player-channel-logo">
            {channel.logo}
          </div>

          <div>
            <strong>{channel.name}</strong>

            <span>
              {channel.category}
            </span>
          </div>
        </div>

        <div className="player-live">
          <span />
          LIVE
        </div>
      </header>

      {/* =================================================
         CHANNEL MENU
         ================================================= */}

      {showChannels && !playlistChannel && (
        <aside className="player-channel-menu">
          <div className="menu-title">
            <span>CHANNELS</span>

            <small>
              ↑ ↓ &nbsp; OK
            </small>
          </div>

          <div className="menu-list">
            {channels.map((item, index) => (
              <button
                key={item.id}
                className={`menu-channel ${
                  index === menuIndex
                    ? "menu-channel-active"
                    : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();

                  setCurrentChannel(index);
                  setMenuIndex(index);
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

      {/* =================================================
         CONTROLS
         ================================================= */}

      {showControls && (
        <div className="player-controls">
          <div className="player-control-row">
            <button
              className="player-control-button"
              onClick={() =>
                changeChannel(-1)
              }
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
              onClick={() =>
                changeChannel(1)
              }
            >
              ▶
            </button>

            <div className="player-volume">
              <span>
                {muted ? "🔇" : "🔊"}
              </span>

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
                    videoRef.current.volume =
                      value;

                    if (value > 0) {
                      videoRef.current.muted =
                        false;

                      setMuted(false);
                    }
                  }
                }}
              />
            </div>

            <button
              className="player-control-button"
              onClick={toggleMute}
            >
              {muted ? "🔇" : "🔊"}
            </button>

            <button
              className="player-control-button fullscreen-button"
              onClick={toggleFullscreen}
            >
              ⛶
            </button>
          </div>

          <div className="player-control-info">
            <span>
              ↑ ↓ Channel
            </span>

            <span>
              ENTER Play / Pause
            </span>

            <span>
              ← Channels
            </span>

            <span>
              ESC Back
            </span>
          </div>
        </div>
      )}
    </main>
  );
}

export default Player;