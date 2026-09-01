import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Capacitor,
} from "@capacitor/core";
import type {
  ParsedChannel,
} from "../services/m3uParser";

import bonoLogoGold from "../assets/bono_logo_gold_no_player.png";

import {
  getDevicePlaylists,
  getLiveChannels,
} from "../services/xtreamService";

import type {
  DevicePlaylist,
} from "../services/xtreamService";

import {
  formatEpgTime,
  getChannelGuide,
  getProgramProgress,
} from "../services/epgService";

import type {
  EpgGuide,
} from "../services/epgService";

import "./LiveTV.css";

import {
  enterNativeLiveFullscreen,
  playNativePreview,
  stopNativePreview,
} from "../services/nativePlayer";

type LiveTVProps = {
  onBack: () => void;

  onPlayChannel: (
    channelIndex: number
  ) => void;

  onPlayPlaylistChannel: (
    channel: ParsedChannel
  ) => void;
};

type FocusArea =
  | "categories"
  | "channels"
  | "search";

type LiveChannel =
  ParsedChannel;

const FAVORITES_STORAGE_KEY =
  "bonoplayer_live_favorites";

const FAVORITE_LONG_PRESS_MS =
  3000;

function LiveTV({
  onBack,
}: LiveTVProps) {
  const pageRef =
    useRef<HTMLElement>(
      null
    );

  const channelRefs =
    useRef<
      (
        HTMLDivElement |
        null
      )[]
    >([]);

  const categoryRefs =
    useRef<
      (
        HTMLDivElement |
        null
      )[]
    >([]);

  const searchInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const previewChannelIdRef =
    useRef<
      string |
      null
    >(null);

  const favoriteLongPressTimerRef =
    useRef<
      number |
      null
    >(null);

  const longPressTriggeredRef =
    useRef(false);

  const [
    playlistChannels,
    setPlaylistChannels,
  ] =
    useState<
      ParsedChannel[]
    >([]);

  const [
  devicePlaylists,
  setDevicePlaylists,
] =
  useState<
    DevicePlaylist[]
  >([]);

const [
  selectedPlaylistIndex,
  setSelectedPlaylistIndex,
] =
  useState(0);

const selectedPlaylist =
  devicePlaylists[
    selectedPlaylistIndex
  ] ?? null;


  const [
    focusedCategory,
    setFocusedCategory,
  ] =
    useState(0);

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState(0);

  const [
    selectedChannel,
    setSelectedChannel,
  ] =
    useState(0);

  const [
    focusArea,
    setFocusArea,
  ] =
    useState<FocusArea>(
      "categories"
    );

  const [
    epgGuide,
    setEpgGuide,
  ] =
    useState<
      EpgGuide |
      null
    >(null);

  const [
    epgLoading,
    setEpgLoading,
  ] =
    useState(false);

  const [
    epgClock,
    setEpgClock,
  ] =
    useState(
      Date.now()
    );

  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    favoriteChannelIds,
    setFavoriteChannelIds,
  ] =
    useState<string[]>(() => {
      try {
        const raw =
          localStorage.getItem(
            FAVORITES_STORAGE_KEY
          );

        if (!raw) {
          return [];
        }

        const parsed =
          JSON.parse(raw);

        if (!Array.isArray(parsed)) {
          return [];
        }

        return parsed.filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        );
      } catch {
        return [];
      }
    });

  const favoriteChannelIdSet =
    useMemo(
      () =>
        new Set(
          favoriteChannelIds
        ),
      [
        favoriteChannelIds,
      ]
    );

  /*
   * =========================================================
   * CATEGORY SCROLL
   * =========================================================
   */

  useEffect(() => {
    const element =
      categoryRefs.current[
        focusedCategory
      ];

    if (!element) {
      return;
    }

    element.scrollIntoView({
      block: "center",
      behavior: "auto",
    });
  }, [
    focusedCategory,
  ]);

  /*
   * =========================================================
   * CLEANUP
   * =========================================================
   */

  useEffect(() => {
    return () => {
      if (
        favoriteLongPressTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          favoriteLongPressTimerRef.current
        );

        favoriteLongPressTimerRef.current =
          null;
      }

      void stopNativePreview();
    };
  }, []);

  /*
   * =========================================================
   * SEARCH INPUT FOCUS
   * =========================================================
   */

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          searchInputRef
            .current
            ?.focus();
        },
        80
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    searchOpen,
  ]);

  /*
   * =========================================================
   * CHANNEL SOURCE
   * =========================================================
   */

  const channels:
    LiveChannel[] =
    useMemo(() => {
      return playlistChannels;
    }, [
      playlistChannels,
    ]);

  const usingRealPlaylist =
    playlistChannels.length >
    0;

  const categories =
    useMemo(() => {
      const uniqueCategories =
        Array.from(
          new Set(
            channels.map(
              (channel) =>
                channel.category ||
                "Other"
            )
          )
        );

      return [
        "All",
        "Favorites",
        ...uniqueCategories,
      ];
    }, [
      channels,
    ]);

  /*
   * =========================================================
   * FILTER CHANNELS
   * =========================================================
   */

  const filteredChannels =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (query) {
        return channels.filter(
          (channel) =>
            channel.name
              .toLowerCase()
              .includes(
                query
              ) ||
            (
              channel.category ||
              ""
            )
              .toLowerCase()
              .includes(
                query
              )
        );
      }

      const category =
        categories[
          selectedCategory
        ];

      if (
        category === "All"
      ) {
        return channels;
      }

      if (
        category ===
        "Favorites"
      ) {
        return channels.filter(
          (channel) =>
            favoriteChannelIdSet.has(
              channel.id
            )
        );
      }

      return channels.filter(
        (channel) =>
          channel.category ===
          category
      );
    }, [
      categories,
      channels,
      selectedCategory,
      searchQuery,
      favoriteChannelIdSet,
    ]);

  const activeChannel =
    filteredChannels[
      selectedChannel
    ] ??
    filteredChannels[0];

  /*
   * =========================================================
   * EPG CLOCK
   * =========================================================
   */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setEpgClock(
            Date.now()
          );
        },
        30_000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  /*
   * =========================================================
   * ACTIVE CHANNEL EPG
   * =========================================================
   */

  useEffect(() => {
    if (!activeChannel) {
      setEpgGuide(
        null
      );

      setEpgLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    setEpgLoading(
      true
    );

    const timer =
      window.setTimeout(
        () => {
          void getChannelGuide(
            "326498",
            activeChannel.name,
            activeChannel.epgId
          )
            .then(
              (guide) => {
                if (
                  cancelled
                ) {
                  return;
                }

                setEpgGuide(
                  guide
                );
              }
            )
            .catch(
              (error) => {
                if (
                  cancelled
                ) {
                  return;
                }

                console.error(
                  "BONO EPG load failed:",
                  error
                );

                setEpgGuide(
                  null
                );
              }
            )
            .finally(
              () => {
                if (
                  !cancelled
                ) {
                  setEpgLoading(
                    false
                  );
                }
              }
            );
        },
        220
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    activeChannel?.id,
    activeChannel?.name,
    activeChannel?.epgId,
  ]);

  const currentProgram =
    epgGuide?.now ??
    null;

  const upcomingPrograms =
    epgGuide?.upcoming ??
    [];

  const displayedUpcomingPrograms =
    upcomingPrograms.slice(
      0,
      3
    );

  const currentProgramProgress =
    getProgramProgress(
      currentProgram,
      epgClock
    );

  /*
   * =========================================================
   * CHANNEL WINDOW
   * =========================================================
   */

  const CHANNEL_WINDOW_SIZE =
    21;

  const channelWindowStart =
    Math.max(
      0,
      Math.min(
        selectedChannel -
          Math.floor(
            CHANNEL_WINDOW_SIZE /
              2
          ),
        Math.max(
          0,
          filteredChannels.length -
            CHANNEL_WINDOW_SIZE
        )
      )
    );

  const visibleChannels =
    filteredChannels.slice(
      channelWindowStart,
      channelWindowStart +
        CHANNEL_WINDOW_SIZE
    );

  useEffect(() => {
    if (
      focusArea !==
      "channels"
    ) {
      return;
    }

    const localIndex =
      selectedChannel -
      channelWindowStart;

    const element =
      channelRefs.current[
        localIndex
      ];

    if (!element) {
      return;
    }

    element.scrollIntoView({
      block: "center",
      behavior: "auto",
    });

    pageRef
      .current
      ?.focus();
  }, [
    selectedChannel,
    focusArea,
    channelWindowStart,
  ]);

  /*
 * =========================================================
 * LOAD PLAYLISTS
 * =========================================================
 */

useEffect(() => {
  let cancelled = false;

  const loadPlaylists =
    async () => {
      try {
        const playlists =
          await getDevicePlaylists(
            "326498"
          );

        if (cancelled) {
          return;
        }

        console.log(
          `BONO playlists loaded: ${playlists.length}`
        );

        setDevicePlaylists(
          playlists
        );

        /*
         * نبدأ بـ Xtream افتراضيًا.
         * في حالتنا Neo 4K.
         */
        const savedPlaylistId =
  localStorage.getItem(
    "bonoplayer_selected_playlist"
  );

const savedIndex =
  playlists.findIndex(
    (playlist) =>
      playlist.id ===
      savedPlaylistId
  );

setSelectedPlaylistIndex(
  savedIndex >= 0
    ? savedIndex
    : 0
);
      } catch (error) {
        console.error(
          "BONO playlists load failed:",
          error
        );

        if (!cancelled) {
          setDevicePlaylists(
            []
          );
        }
      }
    };

  void loadPlaylists();

  return () => {
    cancelled = true;
  };
}, []);

/*
 * =========================================================
 * LOAD SELECTED PLAYLIST CHANNELS
 * =========================================================
 */

useEffect(() => {
  if (!selectedPlaylist) {
    return;
  }

  let cancelled = false;

  const loadChannels =
    async () => {
      try {
        /*
         * نوقف Preview القديم قبل
         * الانتقال إلى Playlist أخرى.
         */
        previewChannelIdRef.current =
          null;

        await stopNativePreview();

        const loadedChannels =
          await getLiveChannels(
            "326498",
            selectedPlaylist
          );

        if (cancelled) {
          return;
        }

        console.log(
          `BONO ${selectedPlaylist.name} loaded: ${loadedChannels.length} channels`
        );

        setPlaylistChannels(
          loadedChannels
        );

        setFocusedCategory(
          0
        );

        setSelectedCategory(
          0
        );

        setSelectedChannel(
          0
        );

        setSearchQuery(
          ""
        );
      } catch (error) {
        console.error(
          `BONO ${selectedPlaylist.name} load failed:`,
          error
        );

        if (!cancelled) {
          setPlaylistChannels(
            []
          );
        }
      }
    };

  void loadChannels();

  return () => {
    cancelled = true;
  };
}, [
  selectedPlaylist,
]);


  /*
   * =========================================================
   * RESET CHANNEL
   * =========================================================
   */

  useEffect(() => {
  setSearchQuery(
    ""
  );

  setSelectedChannel(
    0
  );
}, [
  selectedCategory,
]);

  useEffect(() => {
    setSelectedChannel(
      0
    );
  }, [
    searchQuery,
  ]);

  useEffect(() => {
    if (
      filteredChannels.length ===
      0
    ) {
      setSelectedChannel(
        0
      );

      return;
    }

    setSelectedChannel(
      (
        current
      ) =>
        Math.min(
          current,
          filteredChannels.length -
            1
        )
    );
  }, [
    filteredChannels.length,
  ]);

  /*
   * =========================================================
   * CATEGORY COUNT
   * =========================================================
   */

  const categoryCounts =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      for (
        const channel
        of channels
      ) {
        const category =
          channel.category ||
          "Other";

        counts.set(
          category,
          (
            counts.get(
              category
            ) ??
            0
          ) +
            1
        );
      }

      return counts;
    }, [
      channels,
    ]);

  const getCategoryCount =
    (
      category: string
    ) => {
      if (
        category === "All"
      ) {
        return channels.length;
      }

      if (
        category ===
        "Favorites"
      ) {
        return channels.reduce(
          (
            total,
            channel
          ) =>
            favoriteChannelIdSet.has(
              channel.id
            )
              ? total + 1
              : total,
          0
        );
      }

      return (
        categoryCounts.get(
          category
        ) ??
        0
      );
    };

  /*
   * =========================================================
   * FAVORITES
   * =========================================================
   */

  const saveFavorites =
    (
      ids: string[]
    ) => {
      setFavoriteChannelIds(
        ids
      );

      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(
          ids
        )
      );
    };

  const toggleFavorite =
    (
      channel:
        LiveChannel
    ) => {
      const alreadyFavorite =
        favoriteChannelIdSet.has(
          channel.id
        );

      const next =
        alreadyFavorite
          ? favoriteChannelIds.filter(
              (
                id
              ) =>
                id !==
                channel.id
            )
          : [
              ...favoriteChannelIds,
              channel.id,
            ];

      saveFavorites(
        next
      );
    };

  const clearFavoriteLongPressTimer =
    () => {
      if (
        favoriteLongPressTimerRef.current ===
        null
      ) {
        return;
      }

      window.clearTimeout(
        favoriteLongPressTimerRef.current
      );

      favoriteLongPressTimerRef.current =
        null;
    };

  const startFavoriteLongPress =
    () => {
      clearFavoriteLongPressTimer();

      longPressTriggeredRef.current =
        false;

      if (
        focusArea !==
          "channels" ||
        !activeChannel
      ) {
        return;
      }

      favoriteLongPressTimerRef.current =
        window.setTimeout(
          () => {
            favoriteLongPressTimerRef.current =
              null;

            longPressTriggeredRef.current =
              true;

            toggleFavorite(
              activeChannel
            );
          },
          FAVORITE_LONG_PRESS_MS
        );
    };

  /*
   * =========================================================
   * PREVIEW HELPER
   * =========================================================
   */

  const startPreviewForChannel =
    async (
      channel: LiveChannel
    ) => {
      const previewElement =
        document.getElementById(
          "bono-native-preview"
        );

      if (!previewElement) {
        return;
      }

      const rect =
        previewElement
          .getBoundingClientRect();

      if (
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return;
      }

      
      
      
/*
 * TEMP TEST:
 * Print Lynx channel information
 * before sending it to VLC.
 */
console.log(
  "BONO TEST CHANNEL:",
  channel.name
);

console.log(
  "BONO TEST URL:",
  channel.streamUrl
);

console.log(
  "BONO TEST ID:",
  channel.id
);

console.log(
  "BONO TEST EPG:",
  channel.epgId
);

console.log(
  "BONO TEST CATEGORY:",
  channel.category
);

      try {
        await stopNativePreview();

        await playNativePreview({
          streamUrl:
            channel.streamUrl,

          x:
            rect.left,

          y:
            rect.top,

          width:
            rect.width,

          height:
            rect.height,

          scale:
  window.devicePixelRatio ||
  1,
        });

previewChannelIdRef.current =
  channel.id;

      } catch (
        error
      ) {
        previewChannelIdRef.current =
          null;

        console.error(
          "BONO VLC preview failed:",
          error
        );
      }
    };

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

const closeSearch =
  (
    keepQuery =
      true
  ) => {
    setSearchOpen(
      false
    );

    if (
      !keepQuery
    ) {
      setSearchQuery(
        ""
      );
    }

    setSelectedChannel(
      0
    );

    setFocusArea(
      "channels"
    );

    window.setTimeout(
      () => {
        searchInputRef
          .current
          ?.blur();

        pageRef
          .current
          ?.focus();
      },
      0
    );
  };
  /*
   * =========================================================
   * PLAY FULL SCREEN
   * =========================================================
   */

  const playSelectedChannel =
    async () => {
      if (
        !activeChannel
      ) {
        return;
      }

      const isSamePreview =
        previewChannelIdRef.current ===
        activeChannel.id;

      if (
        !isSamePreview
      ) {
        await startPreviewForChannel(
          activeChannel
        );

        return;
      }

      try {
        await enterNativeLiveFullscreen();
      } catch (
        error
      ) {
        console.error(
          "BONO VLC fullscreen failed:",
          error
        );
      }
    };

  /*
   * =========================================================
   * NATIVE OK DOWN / UP
   *
   * Android يرسل:
   * bonoOkDown عند بداية الضغط
   * bonoOkUp   عند رفع الزر
   *
   * بهذا نفصل بدقة بين:
   * - Short press: Preview / Full Screen
   * - Long press 3s: Favorites
   * =========================================================
   */

  useEffect(() => {
    const handleOkDown =
      () => {
        if (
          searchOpen
        ) {
          return;
        }

        if (
          focusArea ===
          "channels"
        ) {
          startFavoriteLongPress();
        }
      };

    const handleOkUp =
      () => {
        if (
          searchOpen
        ) {
          return;
        }

        if (
  focusArea === "categories"
) {
  setSearchQuery("");

  setSelectedCategory(
    focusedCategory
  );

  setSelectedChannel(0);

  setFocusArea(
    "channels"
  );

  return;
} 


        if (
          focusArea ===
          "search"
        ) {
          openSearch();

          return;
        }

        if (
          focusArea !==
            "channels"
        ) {
          return;
        }

        clearFavoriteLongPressTimer();

        /*
         * إذا اكتملت 3 ثوانٍ:
         * Favorites فقط.
         */
        if (
          longPressTriggeredRef.current
        ) {
          longPressTriggeredRef.current =
            false;

          return;
        }

        /*
         * Short press:
         * OK الأولى  -> Preview
         * OK الثانية -> Full Screen
         */
        void playSelectedChannel();
      };

    window.addEventListener(
      "bonoOkDown",
      handleOkDown
    );

    window.addEventListener(
      "bonoOkUp",
      handleOkUp
    );

    return () => {
      window.removeEventListener(
        "bonoOkDown",
        handleOkDown
      );

      window.removeEventListener(
        "bonoOkUp",
        handleOkUp
      );
    };
  }, [
    focusArea,
    searchOpen,
    focusedCategory,
    activeChannel?.id,
    selectedChannel,
    favoriteChannelIds,
  ]);

  useEffect(() => {
  /*
   * Allow the browser Back button
   * to leave Live TV.
   */
  window.history.pushState(
    { bonoLiveTv: true },
    ""
  );

  const handleBrowserBack = () => {
    void stopNativePreview()
      .catch((error) => {
        console.warn(
          "BONO: Preview stop failed:",
          error
        );
      });

    onBack();
  };

  window.addEventListener(
    "popstate",
    handleBrowserBack
  );

  return () => {
    window.removeEventListener(
      "popstate",
      handleBrowserBack
    );
  };
}, [onBack]);

  /*
   * =========================================================
   * REMOTE NAVIGATION
   * =========================================================
   */

const openSearch =
  () => {
    setSearchOpen(
      true
    );

    setFocusArea(
      "search"
    );

    window.setTimeout(
      () => {
        searchInputRef
          .current
          ?.focus();
      },
      0
    );
  };


  const handleKeyDown =
    (
      event:
        React.KeyboardEvent<
          HTMLElement
        >
    ) => {
      const key =
        event.key;

      const code =
        event.keyCode;

      const left =
        key ===
          "ArrowLeft" ||
        key ===
          "Left" ||
        code === 37;

      const right =
        key ===
          "ArrowRight" ||
        key ===
          "Right" ||
        code === 39;

      const up =
        key ===
          "ArrowUp" ||
        key ===
          "Up" ||
        code === 38;

      const down =
        key ===
          "ArrowDown" ||
        key ===
          "Down" ||
        code === 40;

      const enter =
        key ===
          "Enter" ||
        key ===
          "OK" ||
        code === 13;

      const back =
        key ===
          "Escape" ||
        key ===
          "Esc" ||
        key ===
          "Backspace" ||
        code === 4;

      /*
       * SEARCH INPUT OPEN
       */

      if (
        searchOpen
      ) {
        if (
          back
        ) {
          event.preventDefault();

          setSearchOpen(
            false
          );

          window.setTimeout(
            () => {
              searchInputRef
                .current
                ?.blur();

              pageRef
                .current
                ?.focus();
            },
            0
          );

          return;
        }

        return;
      }

      /*
       * LEFT
       */

      if (
        left
      ) {
        event.preventDefault();

        clearFavoriteLongPressTimer();

  if (
  focusArea ===
  "channels"
) {
  setFocusArea(
    "categories"
  );

  setFocusedCategory(
    selectedCategory
  );

  return;
}

        if (
          focusArea ===
          "search"
        ) {
          setFocusArea(
            "categories"
          );
        }

        return;
      }

      /*
       * RIGHT
       */

      if (
        right
      ) {
        event.preventDefault();

        clearFavoriteLongPressTimer();
        return;
      }

      /*
       * UP
       */

      if (
        up
      ) {
        event.preventDefault();

        clearFavoriteLongPressTimer();

        if (
          focusArea ===
          "categories"
        ) {
          if (
            focusedCategory ===
            0
          ) {
            setFocusArea(
              "search"
            );

            return;
          }

          setFocusedCategory(
            (
              current
            ) =>
              Math.max(
                0,
                current -
                  1
              )
          );

          return;
        }

        if (
          focusArea ===
          "channels"
        ) {
          if (
            selectedChannel ===
            0
          ) {
            setFocusArea(
              "search"
            );

            return;
          }

          setSelectedChannel(
            (
              current
            ) =>
              Math.max(
                0,
                current -
                  1
              )
          );

          return;
        }

        return;
      }

      /*
       * DOWN
       */

      if (
        down
      ) {
        event.preventDefault();

        clearFavoriteLongPressTimer();

        if (
          focusArea ===
          "search"
        ) {
          setSelectedChannel(
            0
          );

          setFocusArea(
            "channels"
          );

          return;
        }

        if (
          focusArea ===
          "categories"
        ) {
          setFocusedCategory(
            (
              current
            ) =>
              Math.min(
                categories.length -
                  1,
                current +
                  1
              )
          );

          return;
        }

        if (
          focusArea ===
          "channels"
        ) {
          setSelectedChannel(
            (
              current
            ) =>
              Math.min(
                Math.max(
                  0,
                  filteredChannels.length -
                    1
                ),
                current +
                  1
              )
          );
        }

        return;
      }

 /*
 * ENTER
 */

if (
  enter
) {
  event.preventDefault();

  clearFavoriteLongPressTimer();

  /*
   * SEARCH
   */
  if (
    focusArea ===
    "search"
  ) {
    openSearch();

    return;
  }

  /*
   * CATEGORIES
   */
  if (
    focusArea ===
    "categories"
  ) {
    setSelectedCategory(
      focusedCategory
    );

    setSelectedChannel(
      0
    );

    setFocusArea(
      "channels"
    );

    return;
  }

  /*
   * CHANNELS
   */
  if (
  focusArea ===
  "channels"
) {
  /*
   * Android TV uses bonoOkDown /
   * bonoOkUp for channel OK.
   *
   * Ignore the duplicate native
   * keydown Enter event.
   */
  if (
    Capacitor.isNativePlatform()
  ) {
    return;
  }

  /*
   * Browser / desktop.
   */
  void playSelectedChannel();

  return;
}
}
/*
 * BACK
 */

if (
  back
) {
  event.preventDefault();

  clearFavoriteLongPressTimer();

  if (
    searchQuery
  ) {
    setSearchQuery(
      ""
    );

    setSelectedChannel(
      0
    );

    setFocusArea(
      "categories"
    );

    setFocusedCategory(
      selectedCategory
    );

    return;
  }

 void stopNativePreview()
  .catch(
    (error) => {
      console.warn(
        "BONO: Preview stop failed:",
        error
      );
    }
  );

onBack();

return;
}
};
useEffect(() => {
  const handleWindowKeyDown = (
    event: KeyboardEvent
  ) => {
    const isEnter =
      event.key === "Enter" ||
      event.key === "OK" ||
      event.keyCode === 13;

    if (
      isEnter &&
      focusArea === "search" &&
      !searchOpen
    ) {
      event.preventDefault();

      openSearch();

      return;
    }

    handleKeyDown(
      event as any
    );
  };

  window.addEventListener(
    "keydown",
    handleWindowKeyDown
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleWindowKeyDown
    );
  };
}, [
  focusArea,
  searchOpen,
  searchQuery,
  selectedChannel,
  focusedCategory,
  selectedCategory,
  filteredChannels.length,
]);


  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <main
      ref={
        pageRef
      }
      className="live-tv-page"
      tabIndex={0}
      
      
    >
     <header className="live-tv-header">
  <div className="live-tv-brand">
    <img
      className="live-tv-brand-logo"
      src={bonoLogoGold}
      alt="BONO"
    />
  </div>

  <div className="live-tv-title">
    <h1>LIVE TV</h1>
  </div>

  <div className="live-tv-header-actions">
    <button
  type="button"
  aria-label="Search"
  className={`live-tv-search-trigger ${
    focusArea === "search"
      ? "is-focused"
      : ""
  }`}
  onClick={() => {
    openSearch();
  }}
>
  <span
    className="live-tv-search-trigger-icon"
    aria-hidden="true"
  >
    🔍
  </span>
</button>

    <button
      type="button"
      aria-label="Settings"
    >
      ⚙
    </button>
  </div>
</header>

      {searchOpen && (
        <div className="live-tv-search-overlay">
          <div className="live-tv-search-panel">
            <div className="live-tv-search-panel-top">
              <div className="live-tv-search-panel-icon">
                ⌕
              </div>

              <div className="live-tv-search-panel-copy">
                <span>
                  LIVE TV SEARCH
                </span>

                <strong>
                  Find your channel
                </strong>
              </div>

              <div className="live-tv-search-result-count">
                {
                  filteredChannels.length
                }
              </div>
            </div>

            <div className="live-tv-search-input-shell">
              <span>
                ⌕
              </span>

              <input
                ref={
                  searchInputRef
                }
                value={
                  searchQuery
                }
                onChange={(
                  event
                ) => {
                  setSearchQuery(
                    event.target
                      .value
                  );

                  setSelectedChannel(
                    0
                  );
                }}
                onKeyDown={(
                  event
                ) => {
                  const key =
                    event.key;
                    event.stopPropagation();

      if (
  key ===
    "Escape" ||
  key ===
    "Esc" ||
  key ===
    "Backspace"
) {
  event.preventDefault();

  closeSearch(
    false
  );

  return;
}

                  if (
                    key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    closeSearch(
                      true
                    );
                  }
                }}
                placeholder="Search channels..."
                autoComplete="off"
                spellCheck={
                  false
                }
              />

              {searchQuery && (
                <button
                  type="button"
                  className="live-tv-search-clear"
                  tabIndex={-1}
                  onClick={() => {
                    setSearchQuery(
                      ""
                    );

                    searchInputRef
                      .current
                      ?.focus();
                  }}
                >
                  ×
                </button>
              )}
            </div>

            <div className="live-tv-search-hint">
              Type channel name • OK show results • BACK close
            </div>
          </div>
        </div>
      )}

      <section className="live-tv-layout">
        <aside className="live-tv-categories">
          <div className="live-tv-column-title">
            <span>
              CHANNEL GROUPS
            </span>

            <strong>
              Categories
            </strong>
          </div>

          <div className="live-tv-category-list">
            {categories.map(
              (
                category,
                index
              ) => (
                <div
                  key={
                    category
                  }
                  ref={(
                    element
                  ) => {
                    categoryRefs.current[
                      index
                    ] =
                      element;
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
                    {
                      category
                    }
                  </span>

                  <strong>
                    {
                      getCategoryCount(
                        category
                      )
                    }
                  </strong>
                </div>
              )
            )}
          </div>
        </aside>

        <section className="live-tv-channels">
  <div className="live-tv-column-title">
    <span>
      {usingRealPlaylist
        ? "PLAYLIST CHANNELS"
        : "LIVE CHANNELS"}
    </span>

    <strong>
      {searchQuery
        ? `Search: ${searchQuery}`
        : categories[selectedCategory]}
    </strong>
  </div>

          <div className="live-tv-channel-list">
            {visibleChannels.map(
              (
                channel,
                index
              ) => {
                const actualIndex =
                  channelWindowStart +
                  index;

                return (
                  <div
                    key={`${channel.id}-${actualIndex}`}
                    ref={(
                      element
                    ) => {
                      channelRefs.current[
                        index
                      ] =
                        element;
                    }}
                    className={`live-tv-channel ${
                      focusArea ===
                        "channels" &&
                      selectedChannel ===
                        actualIndex
                        ? "is-focused"
                        : ""
                    }`}
                  >
                    <div className="live-tv-channel-logo">
                      {channel.logo ? (
                        <img
                          src={
                            channel.logo
                          }
                          alt=""
                          className="live-tv-channel-logo-image"
                          loading="lazy"
                        />
                      ) : (
                        <span>
                          {channel.name
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="live-tv-channel-info">
                      <strong>
                        {
                          channel.name
                        }
                      </strong>

                      <span>
                        {channel.category ||
                          "Other"}
                      </span>
                    </div>

                    <div className="live-tv-channel-badges">
                      {favoriteChannelIdSet.has(
                        channel.id
                      ) && (
                        <span
                          className="live-tv-favorite-heart"
                          aria-label="Favorite"
                        >
                          ♥
                        </span>
                      )}

                      {selectedChannel ===
                        actualIndex && (
                        <span className="live-tv-playing-icon">
                          ▶
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="live-tv-preview">
          <div className="live-tv-column-title">
            <span>
              NOW PLAYING
            </span>

            <strong>
              {activeChannel
                ?.name ??
                "No channel"}
            </strong>
          </div>

          <div
            id="bono-native-preview"
            className="live-tv-preview-screen"
          >
            <div className="live-tv-preview-fallback">
              <div className="live-tv-preview-logo">
                {activeChannel
                  ?.logo ? (
                  <img
                    src={
                      activeChannel.logo
                    }
                    alt=""
                    className="live-tv-preview-logo-image"
                  />
                ) : (
                  activeChannel
                    ?.name
                    .slice(
                      0,
                      2
                    )
                    .toUpperCase() ??
                  "TV"
                )}
              </div>
            </div>

            <div className="live-tv-preview-overlay">
              <span>
                LIVE
              </span>

              <strong>
                {activeChannel
                  ?.name ??
                  "Select a channel"}
              </strong>
            </div>
          </div>

          <div className="live-tv-epg-list">
            <div className="live-tv-epg-now">
              <div className="live-tv-epg-now-top">
                <div className="live-tv-epg-now-label">
                  <span className="live-tv-epg-live-dot" />
                  NOW
                </div>

                <span className="live-tv-epg-time">
                  {currentProgram
                    ? `${formatEpgTime(
                        currentProgram.startTimestamp
                      )} - ${formatEpgTime(
                        currentProgram.endTimestamp
                      )}`
                    : "LIVE"}
                </span>
              </div>

              <strong className="live-tv-epg-now-title">
                {epgLoading
                  ? "Loading EPG..."
                  : currentProgram
                      ?.title ??
                    "Live Broadcast"}
              </strong>

              <div className="live-tv-epg-progress">
                <span
                  style={{
                    width:
                      `${currentProgramProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="live-tv-epg-upcoming">
              {displayedUpcomingPrograms.length >
              0 ? (
                displayedUpcomingPrograms.map(
                  (
                    program,
                    index
                  ) => (
                    <div
                      key={`${program.startTimestamp}-${index}`}
                      className="live-tv-epg-upcoming-row"
                    >
                      <div className="live-tv-epg-upcoming-number">
                        {index +
                          1}
                      </div>

                      <div className="live-tv-epg-upcoming-copy">
                        <div className="live-tv-epg-upcoming-meta">
                          <span>
                            {index ===
                            0
                              ? "UP NEXT"
                              : "LATER"}
                          </span>

                          <span>
                            {formatEpgTime(
                              program.startTimestamp
                            )}
                          </span>
                        </div>

                        <strong>
                          {
                            program.title
                          }
                        </strong>
                      </div>
                    </div>
                  )
                )
              ) : (
                <>
                  {[1, 2, 3].map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item
                        }
                        className="live-tv-epg-upcoming-row is-empty"
                      >
                        <div className="live-tv-epg-upcoming-number">
                          {
                            item
                          }
                        </div>

                        <div className="live-tv-epg-upcoming-copy">
                          <div className="live-tv-epg-upcoming-meta">
                            <span>
                              {item ===
                              1
                                ? "UP NEXT"
                                : "LATER"}
                            </span>
                          </div>

                          <strong>
                            No programme information
                          </strong>
                        </div>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </section>

      <footer className="live-tv-footer">
        <span>
          {searchQuery
            ? `${filteredChannels.length} search results`
            : usingRealPlaylist
              ? `${channels.length} playlist channels`
              : `${channels.length} demo channels`}
        </span>

        <span>
          ← → Switch panel
        </span>

        <span>
          ↑ ↓ Navigate
        </span>

        <span>
          OK Select / Play
        </span>

        <span>
          Hold OK 3s ♥ Favorite
        </span>

        <span>
          BACK Return
        </span>
      </footer>
    </main>
  );
}

export default LiveTV;