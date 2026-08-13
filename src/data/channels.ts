export type Channel = {
  id: number;
  name: string;
  category: string;
  logo: string;
  streamUrl: string;
};

export const channels: Channel[] = [
  {
    id: 1,
    name: "Bono News",
    category: "News",
    logo: "BN",
    streamUrl:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 2,
    name: "World News",
    category: "News",
    logo: "WN",
    streamUrl:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 3,
    name: "Bono Sport",
    category: "Sports",
    logo: "BS",
    streamUrl:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 4,
    name: "Sport Live",
    category: "Sports",
    logo: "SL",
    streamUrl:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 5,
    name: "Bono Cinema",
    category: "Movies",
    logo: "BC",
    streamUrl:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 6,
    name: "Action HD",
    category: "Movies",
    logo: "AH",
    streamUrl:
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
];