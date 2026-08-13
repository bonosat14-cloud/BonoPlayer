import { useEffect, useRef, useState } from "react";
import "./Home.css";
import { channels } from "../data/channels";
import type { Channel } from "../data/channels";

type HomeProps = {
  onPlayChannel: (channelIndex: number) => void;
};

type Category = {
  id: string;
  name: string;
  icon: string;
};

const categories: Category[] = [
  { id: "all", name: "All Channels", icon: "▦" },
  { id: "news", name: "News", icon: "◉" },
  { id: "sports", name: "Sports", icon: "◆" },
  { id: "movies", name: "Movies", icon: "▶" },
  { id: "kids", name: "Kids", icon: "★" },
];

function Home({ onPlayChannel }: HomeProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [focusedChannel, setFocusedChannel] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const homeRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    homeRef.current?.focus();
  }, []);

  const filteredChannels = channels.filter((channel) => {
    const categoryMatch =
      selectedCategory === "all" ||
      channel.category.toLowerCase() === selectedCategory;

    const searchMatch =
      searchText.trim() === "" ||
      channel.name
        .toLowerCase()
        .includes(searchText.toLowerCase());

    return categoryMatch && searchMatch;
  });

  useEffect(() => {
    setFocusedChannel(0);
  }, [selectedCategory, searchText]);

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    }
  }, [searchOpen]);

  const handleChannelSelect = (channel: Channel) => {
    const globalIndex = channels.findIndex(
      (item) => item.id === channel.id
    );

    if (globalIndex !== -1) {
      onPlayChannel(globalIndex);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    if (searchOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSearchOpen(false);
        setSearchText("");
        homeRef.current?.focus();
      }

      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();

        if (focusedChannel > 0) {
          setFocusedChannel((current) => current - 1);
        }

        break;

      case "ArrowRight":
        event.preventDefault();

        if (
          focusedChannel <
          filteredChannels.length - 1
        ) {
          setFocusedChannel((current) => current + 1);
        }

        break;

      case "ArrowUp":
        event.preventDefault();

        if (focusedChannel >= 4) {
          setFocusedChannel(
            (current) => current - 4
          );
        }

        break;

      case "ArrowDown":
        event.preventDefault();

        if (
          focusedChannel + 4 <
          filteredChannels.length
        ) {
          setFocusedChannel(
            (current) => current + 4
          );
        }

        break;

      case "Enter": {
        event.preventDefault();

        const channel =
          filteredChannels[focusedChannel];

        if (channel) {
          handleChannelSelect(channel);
        }

        break;
      }

      case "s":
      case "S":
        event.preventDefault();
        setSearchOpen(true);
        break;

      case "Escape":
        event.preventDefault();
        break;

      default:
        break;
    }
  };

  return (
    <main
      ref={homeRef}
      className="home-page"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <header className="home-header">
        <div className="home-brand">
          <div className="home-logo">B</div>

          <div className="home-brand-name">
            BONO<span>PLAYER</span>
          </div>
        </div>

        <div className="home-actions">
          <button
            className="home-action-button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            🔍
          </button>

          <div className="home-profile">
            <div className="profile-avatar">B</div>

            <div className="profile-text">
              <strong>Bono Player</strong>
              <span>Active device</span>
            </div>
          </div>
        </div>
      </header>

      <section className="home-content">
        <div className="home-welcome">
          <div>
            <p className="home-eyebrow">
              WELCOME BACK
            </p>

            <h1>Watch your channels</h1>

            <p>
              Select a channel to start watching.
            </p>
          </div>
        </div>

        <section className="category-section">
          <div className="section-heading">
            <h2>Categories</h2>
          </div>

          <div className="category-list">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`category-card ${
                  selectedCategory === category.id
                    ? "category-selected"
                    : ""
                }`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setFocusedChannel(0);
                }}
              >
                <span className="category-icon">
                  {category.icon}
                </span>

                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="channels-section">
          <div className="section-heading">
            <h2>
              {selectedCategory === "all"
                ? "All Channels"
                : categories.find(
                    (category) =>
                      category.id ===
                      selectedCategory
                  )?.name}
            </h2>

            <span className="channel-count">
              {filteredChannels.length} channels
            </span>
          </div>

          <div className="channel-grid">
            {filteredChannels.map(
              (channel, index) => (
                <button
                  key={channel.id}
                  className={`channel-card ${
                    focusedChannel === index
                      ? "channel-focused"
                      : ""
                  }`}
                  onClick={() =>
                    handleChannelSelect(channel)
                  }
                  onMouseEnter={() =>
                    setFocusedChannel(index)
                  }
                >
                  <div className="channel-logo">
                    {channel.logo}
                  </div>

                  <div className="channel-info">
                    <strong>
                      {channel.name}
                    </strong>

                    <span>
                      {channel.category.toUpperCase()}
                    </span>
                  </div>

                  <div className="channel-live">
                    LIVE
                  </div>
                </button>
              )
            )}
          </div>

          {filteredChannels.length === 0 && (
            <div className="no-channels">
              No channels found
            </div>
          )}
        </section>
      </section>

      <footer className="home-footer">
        <span>↑ ↓ Navigate</span>
        <span>ENTER Select</span>
        <span>S Search</span>
        <span>ESC Back</span>

        <span className="home-version">
          BonoPlayer
        </span>
      </footer>

      {searchOpen && (
        <div className="search-overlay">
          <div className="search-box">
            <h2>Search channels</h2>

            <input
              ref={searchRef}
              type="text"
              value={searchText}
              placeholder="Type channel name..."
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setSearchOpen(false);
                  setSearchText("");
                  homeRef.current?.focus();
                }
              }}
            />

            <p>
              Press ESC to close
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;