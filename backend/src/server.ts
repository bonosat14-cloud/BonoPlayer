import express from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

type Device = {
  deviceId: string;
  devicePin: string;
  status: "trial" | "active" | "expired";
  package: "trial" | "1year" | "lifetime";
};

const devices: Device[] = [
  {
    deviceId: "326498",
    devicePin: "457961",
    status: "active",
    package: "1year",
  },
];
type Playlist = {
  id: string;
  deviceId: string;
  name: string;
  type: "m3u" | "xtream";
  url?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
};

const playlists: Playlist[] = [
  {
    id: "playlist-1",
    deviceId: "326498",
    name: "Neo 4K",
    type: "xtream",
    serverUrl: "http://tv.business-cloud-neo.com",
    username: "dfbd3681ded9",
    password: "6d97346e0d",
  },
];
app.use(cors());
app.use(express.json());
app.get(
  "/api/device/:deviceId/live/categories",
  async (req, res) => {
    const { deviceId } = req.params;

    const playlist = playlists.find(
      (item) =>
        item.deviceId === deviceId &&
        item.type === "xtream"
    );

    if (
      !playlist ||
      !playlist.serverUrl ||
      !playlist.username ||
      !playlist.password
    ) {
      return res.status(404).json({
        ok: false,
        message: "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_live_categories`;

      const response = await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message: `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const categories = await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName: playlist.name,
        categories,
      });
    } catch (error) {
      console.error(
        "Xtream categories request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message: "Unable to load live categories.",
      });
    }
  }
);
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "BONO Backend",
    message: "BONO Backend is running",
  });
});
app.post("/api/device/login", (req, res) => {
  const { deviceId, devicePin } = req.body;

  if (!deviceId || !devicePin) {
    return res.status(400).json({
      ok: false,
      message: "Device ID and Device PIN are required.",
    });
  }

  const device = devices.find(
    (item) =>
      item.deviceId === String(deviceId) &&
      item.devicePin === String(devicePin)
  );

  if (!device) {
    return res.status(401).json({
      ok: false,
      message: "Invalid Device ID or Device PIN.",
    });
  }

  return res.json({
    ok: true,
    device: {
      deviceId: device.deviceId,
      status: device.status,
      package: device.package,
    },
  });
});
app.get("/api/device/:deviceId/playlists", (req, res) => {
  const { deviceId } = req.params;

  const device = devices.find(
    (item) => item.deviceId === deviceId
  );

  if (!device) {
    return res.status(404).json({
      ok: false,
      message: "Device not found.",
    });
  }

  const devicePlaylists = playlists
    .filter(
      (playlist) => playlist.deviceId === deviceId
    )
    .map((playlist) => ({
      id: playlist.id,
      deviceId: playlist.deviceId,
      name: playlist.name,
      type: playlist.type,
    }));

  return res.json({
    ok: true,
    deviceId,
    playlists: devicePlaylists,
  });
});

app.get(
  "/api/device/:deviceId/live/streams",
  async (req, res) => {
    const { deviceId } = req.params;
    const { categoryId } = req.query;

    const playlist = playlists.find(
      (item) =>
        item.deviceId === deviceId &&
        item.type === "xtream"
    );

    if (
      !playlist ||
      !playlist.serverUrl ||
      !playlist.username ||
      !playlist.password
    ) {
      return res.status(404).json({
        ok: false,
        message: "Xtream playlist not found for this device.",
      });
    }

    try {
      let url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(playlist.username)}` +
        `&password=${encodeURIComponent(playlist.password)}` +
        `&action=get_live_streams`;

      if (
        typeof categoryId === "string" &&
        categoryId
      ) {
        url += `&category_id=${encodeURIComponent(
          categoryId
        )}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message: `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const streams = await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName: playlist.name,
        streams,
      });
    } catch (error) {
      console.error(
        "Xtream streams request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message: "Unable to load live streams.",
      });
    }
  }
);
app.get(
  "/api/device/:deviceId/live/play/:streamId",
  async (req, res) => {
    const { deviceId, streamId } = req.params;

    const playlist = playlists.find(
      (item) =>
        item.deviceId === deviceId &&
        item.type === "xtream"
    );

    if (
      !playlist ||
      !playlist.serverUrl ||
      !playlist.username ||
      !playlist.password
    ) {
      return res.status(404).json({
        ok: false,
        message: "Xtream playlist not found.",
      });
    }

    const streamUrl =
      `${playlist.serverUrl}/live/` +
      `${encodeURIComponent(playlist.username)}/` +
      `${encodeURIComponent(playlist.password)}/` +
      `${encodeURIComponent(streamId)}.ts`;

    return res.redirect(302, streamUrl);
  }
);
app.get(
  "/api/device/:deviceId/vod/categories",
  async (req, res) => {
    const { deviceId } = req.params;

    const playlist = playlists.find(
      (item) =>
        item.deviceId === deviceId &&
        item.type === "xtream"
    );

    if (
      !playlist ||
      !playlist.serverUrl ||
      !playlist.username ||
      !playlist.password
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      const url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_vod_categories`;

      const response = await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const categories =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName: playlist.name,
        categories,
      });
    } catch (error) {
      console.error(
        "Xtream VOD categories request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load movie categories.",
      });
    }
  }
);
app.get(
  "/api/device/:deviceId/vod/streams",
  async (req, res) => {
    const { deviceId } = req.params;
    const { categoryId } = req.query;

    const playlist = playlists.find(
      (item) =>
        item.deviceId === deviceId &&
        item.type === "xtream"
    );

    if (
      !playlist ||
      !playlist.serverUrl ||
      !playlist.username ||
      !playlist.password
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found for this device.",
      });
    }

    try {
      let url =
        `${playlist.serverUrl}/player_api.php` +
        `?username=${encodeURIComponent(
          playlist.username
        )}` +
        `&password=${encodeURIComponent(
          playlist.password
        )}` +
        `&action=get_vod_streams`;

      if (
        typeof categoryId === "string" &&
        categoryId
      ) {
        url +=
          `&category_id=${encodeURIComponent(
            categoryId
          )}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          message:
            `Xtream server returned HTTP ${response.status}.`,
        });
      }

      const streams =
        await response.json();

      return res.json({
        ok: true,
        deviceId,
        playlistName: playlist.name,
        streams,
      });
    } catch (error) {
      console.error(
        "Xtream VOD streams request failed:",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to load movies.",
      });
    }
  }
);
app.get(
  "/api/device/:deviceId/vod/play/:streamId/:extension",
  async (req, res) => {
    const {
      deviceId,
      streamId,
      extension,
    } = req.params;

    const playlist = playlists.find(
      (item) =>
        item.deviceId === deviceId &&
        item.type === "xtream"
    );

    if (
      !playlist ||
      !playlist.serverUrl ||
      !playlist.username ||
      !playlist.password
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "Xtream playlist not found.",
      });
    }

    const safeExtension =
      extension.replace(
        /[^a-zA-Z0-9]/g,
        ""
      );

    if (!safeExtension) {
      return res.status(400).json({
        ok: false,
        message:
          "Invalid movie extension.",
      });
    }

    const streamUrl =
      `${playlist.serverUrl}/movie/` +
      `${encodeURIComponent(
        playlist.username
      )}/` +
      `${encodeURIComponent(
        playlist.password
      )}/` +
      `${encodeURIComponent(
        streamId
      )}.` +
      safeExtension;

    return res.redirect(
      302,
      streamUrl
    );
  }
);
app.listen(PORT, () => {
  console.log(`BONO Backend running on port ${PORT}`);
});