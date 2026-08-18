import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ParsedChannel } from "../services/m3uParser";
import { getLiveChannels } from "../services/xtreamService";

import "./LiveTV.css";

import {
  playNativePreview,
  playNativeFullscreen,
  stopNativePreview,
} from "../services/nativePlayer";

type LiveTVProps = {
  onBack: () => void;
  onPlayChannel: (channelIndex: number) => void;
  onPlayPlaylistChannel: (
    channel: ParsedChannel
  ) => void;
};

type FocusArea = "categories" | "channels";

type LiveChannel = ParsedChannel;

function LiveTV({
  onBack,
 }: LiveTVProps) {
  const pageRef = useRef<HTMLElement>(null);
 
  const channelRefs =
  useRef<(HTMLDivElement | null)[]>([]); 
 
  const categoryRefs =
    useRef<(HTMLDivElement | null)[]>([]);
  
    const previewChannelIdRef =
  useRef<string | null>(null);
  
  const [playlistChannels, setPlaylistChannels] =
    useState<ParsedChannel[]>([]);

  const [focusedCategory, setFocusedCategory] =
    useState(0);

  const [selectedCategory, setSelectedCategory] =
    useState(0);

  const [selectedChannel, setSelectedChannel] =
    useState(0);


  const [focusArea, setFocusArea] =
    useState<FocusArea>("categories");


  useEffect(() => {
  const element =
    categoryRefs.current[focusedCategory];

  if (!element) {
    return;
  }

  element.scrollIntoView({
    block: "center",
    behavior: "auto",
  });
}, [focusedCategory]);

useEffect(() => {
  return () => {
    void stopNativePreview();
  };
}, []);

  /*
   * =========================================================
   * CHANNEL SOURCE
   * =========================================================
   */

  const channels: LiveChannel[] = useMemo(() => {
    return playlistChannels;
  }, [playlistChannels]);

  const usingRealPlaylist = playlistChannels.length > 0;

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        channels.map(
          (channel) =>
            channel.category || "Other"
        )
      )
    );

    return ["All", ...uniqueCategories];
  }, [channels]);
  /*
   * =========================================================
   * FILTER CHANNELS
   * =========================================================
   */

  const filteredChannels = useMemo(() => {
    const category =
      categories[selectedCategory];

    if (category === "All") {
      return channels;
    }

    return channels.filter(
      (channel) =>
        channel.category === category
    );
  }, [
    categories,
    channels,
    selectedCategory,
  ]);

  const activeChannel =
    filteredChannels[selectedChannel] ??
    filteredChannels[0];
    const CHANNEL_WINDOW_SIZE = 21;

const channelWindowStart = Math.max(
  0,
  Math.min(
    selectedChannel -
      Math.floor(CHANNEL_WINDOW_SIZE / 2),
    Math.max(
      0,
      filteredChannels.length -
        CHANNEL_WINDOW_SIZE
    )
  )
);

const visibleChannels = filteredChannels.slice(
  channelWindowStart,
  channelWindowStart + CHANNEL_WINDOW_SIZE
);
useEffect(() => {
  if (focusArea !== "channels") {
    return;
  }

  const localIndex =
    selectedChannel - channelWindowStart;

  const element =
    channelRefs.current[localIndex];

  if (!element) {
    return;
  }

  element.scrollIntoView({
    block: "center",
    behavior: "auto",
  });

  pageRef.current?.focus();
}, [
  selectedChannel,
  focusArea,
  channelWindowStart,
]);

  /*
   * =========================================================
   * INITIAL FOCUS
   * =========================================================
   */

  useEffect(() => {
  const loadXtreamChannels = async () => {
    try {
      const channels =
        await getLiveChannels("326498");

      console.log(
        `BONO Xtream loaded: ${channels.length} channels`
      );

      setPlaylistChannels(channels);
    } catch (error) {
      console.error(
        "BONO Xtream load failed:",
        error
      );

      setPlaylistChannels([]);
    }
  };

  void loadXtreamChannels();
}, []);

  /*
   * =========================================================
   * RESET CHANNEL WHEN CATEGORY CHANGES
   * =========================================================
   */

  useEffect(() => {
    setSelectedChannel(0);
  }, [selectedCategory]);

  /*
   * =========================================================
   * LIVE PREVIEW
   * =========================================================
   */

  /*
   * =========================================================
   * CATEGORY COUNT
   * =========================================================
   */

  const categoryCounts = useMemo(() => {
  const counts = new Map<string, number>();

  for (const channel of channels) {
    const category =
      channel.category || "Other";

    counts.set(
      category,
      (counts.get(category) ?? 0) + 1
    );
  }

  return counts;
}, [channels]);

const getCategoryCount = (
  category: string
) => {
  if (category === "All") {
    return channels.length;
  }

  return categoryCounts.get(category) ?? 0;
};

  /*
   * =========================================================
   * PLAY FULL SCREEN
   * =========================================================
   */

   const playSelectedChannel = async () => {
  if (!activeChannel) {
    return;
  }

  console.log(
    "BONO PLAY CHECK:",
    "active=",
    activeChannel.id,
    "preview=",
    previewChannelIdRef.current
  );

  const isSamePreview =
    previewChannelIdRef.current === activeChannel.id;

  /*
   * OK الأولى على قناة جديدة
   * = Preview
   */
  if (!isSamePreview) {
    const previewElement =
      document.getElementById(
        "bono-native-preview"
      );

    if (!previewElement) {
      return;
    }

    const rect =
      previewElement.getBoundingClientRect();

    /*
     * نسجل القناة فورًا قبل await
     */
    previewChannelIdRef.current =
      activeChannel.id;


    try {
      await stopNativePreview();

      await playNativePreview({
        streamUrl: activeChannel.streamUrl,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        scale: window.devicePixelRatio || 1,
      });
    } catch (error) {
      previewChannelIdRef.current = null;
      

      console.error(
        "BONO VLC preview failed:",
        error
      );
    }

    return;
  }
   console.log(
   "BONO SECOND OK -> FULLSCREEN",
   activeChannel.id
);
  /*
   * OK الثانية على نفس القناة
   * = Full Screen
   */
  try {
    previewChannelIdRef.current = null;

    await stopNativePreview();

    await playNativeFullscreen(
      activeChannel.streamUrl
    );
  } catch (error) {
    console.error(
      "BONO VLC fullscreen failed:",
      error
    );
  }
};
useEffect(() => {
  const handleBonoOk = () => {
    /*
     * OK داخل Categories
     * = اعتماد الباقة والدخول إلى Channels
     */
    if (focusArea === "categories") {
      setSelectedCategory(focusedCategory);
      setSelectedChannel(0);
      setFocusArea("channels");
      return;
    }

    /*
     * OK داخل Channels
     *
     * الأولى = VLC Preview
     * الثانية = VLC Full Screen
     */
    if (focusArea === "channels") {
      void playSelectedChannel();
      return;
    }
  };

  window.addEventListener(
    "bonoOk",
    handleBonoOk
  );

  return () => {
    window.removeEventListener(
      "bonoOk",
      handleBonoOk
    );
  };
}, [
  focusArea,
  focusedCategory,
  activeChannel?.id,
]);
/*
 * =========================================================
 * REMOTE NAVIGATION
 * =========================================================
 */

  const handleKeyDown = (
  event: React.KeyboardEvent<HTMLElement>
) => {
  const key = event.key;
  const code = event.keyCode;
 
  console.log(
  "BONO KEY:",
  key,
  code,
  "AREA:",
  focusArea,
  "CHANNEL:",
  selectedChannel
);

  const left =
    key === "ArrowLeft" ||
    key === "Left" ||
    code === 37;

  const right =
    key === "ArrowRight" ||
    key === "Right" ||
    code === 39;

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

  const back =
    key === "Escape" ||
    key === "Esc" ||
    key === "Backspace" ||
    code === 4;

  /*
   * LEFT
   */

  if (left) {
    event.preventDefault();

    if (focusArea === "channels") {
      setFocusArea("categories");
      setFocusedCategory(selectedCategory);
    }

    return;
  }

  /*
   * RIGHT
   *
   * لا ندخل إلى القنوات بزر RIGHT.
   * يجب اختيار Category بواسطة OK.
   */

  if (right) {
    event.preventDefault();
    return;
  }

  /*
   * UP
   */

  if (up) {
    event.preventDefault();

    if (focusArea === "categories") {
      setFocusedCategory((current) =>
        Math.max(0, current - 1)
      );
    } else {
      setSelectedChannel((current) =>
        Math.max(0, current - 1)
      );
    }

    return;
  }

  /*
   * DOWN
   */

  if (down) {
    event.preventDefault();

    if (focusArea === "categories") {
      setFocusedCategory((current) =>
        Math.min(
          categories.length - 1,
          current + 1
        )
      );
    } else {
      setSelectedChannel((current) =>
        Math.min(
          Math.max(
            0,
            filteredChannels.length - 1
          ),
          current + 1
        )
      );
    }

    return;
  }
/*
 * ENTER / OK
 */

if (enter) {
  event.preventDefault();
  return;
}

/*
 * BACK
 */

if (back) {
  event.preventDefault();

  if (focusArea === "channels") {
    setFocusArea("categories");
    setFocusedCategory(selectedCategory);
    return;
  }

  void stopNativePreview().finally(() => {
    onBack();
  });

  return;
}
};
return (
  <main
    ref={pageRef}
    className="live-tv-page"
    tabIndex={0}
    onKeyDown={handleKeyDown}
  >
    {/* =====================================================
        HEADER
    ===================================================== */}

    <header className="live-tv-header">
        <div className="live-tv-brand">
          BONO
        </div>

        <h1>Live TV</h1>

        <div className="live-tv-header-actions">
          <button
            type="button"
            aria-label="Search"
          >
            ⌕
          </button>

          <button
            type="button"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <section className="live-tv-layout">
        {/* ===================================================
            CATEGORIES
        =================================================== */}

        <aside className="live-tv-categories">
          <div className="live-tv-column-title">
            <span>CHANNEL GROUPS</span>

            <strong>Categories</strong>
          </div>

          <div className="live-tv-category-list">
            {categories.map(
              (category, index) => (
                <div
                  key={category}
                  ref={(element) => {
                    categoryRefs.current[index] = element;
                  }}
                  className={`live-tv-category ${
                    focusArea ===
                      "categories" &&
                    focusedCategory ===
                      index
                      ? "is-focused"
                      : ""
                  }`}
                >
                  <span>
                    {category}
                  </span>

                  <strong>
                    {getCategoryCount(
                      category
                    )}
                  </strong>
                </div>
              )
            )}
          </div>
        </aside>
     {/* ===================================================
         CHANNELS
         =================================================== */}

<section className="live-tv-channels">
  <div className="live-tv-column-title">
    <span>
      {usingRealPlaylist
        ? "PLAYLIST CHANNELS"
        : "LIVE CHANNELS"}
    </span>

    <strong>
      {categories[selectedCategory]}
    </strong>
  </div>

  <div className="live-tv-channel-list">
    {visibleChannels.map((channel, index) => {
      const actualIndex =
        channelWindowStart + index;

      return (
        <div
          key={`${channel.id}-${actualIndex}`}
          ref={(element) => {
            channelRefs.current[index] = element;
           }}
          className={`live-tv-channel ${
            focusArea === "channels" &&
            selectedChannel === actualIndex
              ? "is-focused"
              : ""
          }`}
        >
          <div className="live-tv-channel-logo">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt=""
                className="live-tv-channel-logo-image"
                loading="lazy"
              />
            ) : (
              <span>
                {channel.name
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="live-tv-channel-info">
            <strong>
              {channel.name}
            </strong>

            <span>
              {channel.category || "Other"}
            </span>
          </div>

          {selectedChannel === actualIndex && (
            <span className="live-tv-playing-icon">
              ▶
            </span>
          )}
        </div>
      );
    })}
  </div>
</section>

        {/* ===================================================
    PREVIEW / EPG
=================================================== */}

<section className="live-tv-preview">
  <div className="live-tv-column-title">
    <span>NOW PLAYING</span>

    <strong>
      {activeChannel?.name ?? "No channel"}
    </strong>
  </div>

  <div
    id="bono-native-preview"
    className="live-tv-preview-screen"
  >
    <div className="live-tv-preview-fallback">
      <div className="live-tv-preview-logo">
        {activeChannel?.logo ? (
          <img
            src={activeChannel.logo}
            alt=""
            className="live-tv-preview-logo-image"
          />
        ) : (
          activeChannel?.name
            .slice(0, 2)
            .toUpperCase() ?? "TV"
        )}
      </div>
    </div>

    <div className="live-tv-preview-overlay">
      <span>LIVE</span>

      <strong>
        {activeChannel?.name ??
          "Select a channel"}
      </strong>
    </div>
  </div>

  <div className="live-tv-program">
  <div className="live-tv-program-status">
    <span className="live-dot" />
    NOW
  </div>

  <h2>Live Broadcast</h2>

  <p>
    Program information and EPG
    will appear here when the
    playlist and EPG service are
    connected.
  </p>

  <div className="live-tv-progress">
    <div className="live-tv-progress-bar">
      <span />
    </div>

    <div className="live-tv-progress-time">
      <span>Now</span>
      <span>Live</span>
    </div>
  </div>
</div>

<div className="live-tv-next-programs">
  <div className="live-tv-next-item">
    <span>UP NEXT</span>

    <strong>
      Program information
    </strong>
  </div>

  <div className="live-tv-next-item">
    <span>LATER</span>

    <strong>
      EPG schedule
    </strong>
  </div>
</div>

</section>

</section>
      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="live-tv-footer">
        <span>
          {usingRealPlaylist
            ? `${channels.length} playlist channels`
            : `${channels.length} demo channels`}
        </span>

        <span>← → Switch panel</span>
        <span>↑ ↓ Navigate</span>
        <span>OK Select / Play</span>
        <span>BACK Return</span>
      </footer>
    </main>
  );
}

export default LiveTV;