import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  API_BASE_URL,
} from "../config/api";

export type DeviceLoginResponse = {
  ok: boolean;
  device?: {
    deviceId: string;
    status: "trial" | "active" | "expired";
    package: "trial" | "1year" | "lifetime";
  };
  message?: string;
};

export type DevicePlaylist = {
  id: string;
  deviceId: string;
  name: string;
  type: "m3u" | "xtream";
  url?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
};

export type DevicePlaylistsResponse = {
  ok: boolean;
  deviceId?: string;
  playlists?: DevicePlaylist[];
  message?: string;
};

export async function loginDevice(
  deviceId: string,
  devicePin: string
): Promise<DeviceLoginResponse> {
  const response = await CapacitorHttp.request({
    url: `${API_BASE_URL}/api/device/login`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      deviceId,
      devicePin,
    },
  });

  return response.data as DeviceLoginResponse;
}

export async function getDevicePlaylists(
  deviceId: string
): Promise<DevicePlaylistsResponse> {
  const response = await CapacitorHttp.request({
    url: `${API_BASE_URL}/api/device/${deviceId}/playlists`,
    method: "GET",
  });

  return response.data as DevicePlaylistsResponse;
}