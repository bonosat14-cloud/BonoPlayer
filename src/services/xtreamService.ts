import { CapacitorHttp } from "@capacitor/core";
import type { ParsedChannel } from "./m3uParser";

const API_BASE_URL = "http://192.168.1.6:4000";

type XtreamCategory = {
  category_id: string;
  category_name: string;
};

type XtreamStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  category_id: string;
  category_ids?: number[];
};

type CategoriesResponse = {
  ok: boolean;
  categories?: XtreamCategory[];
  message?: string;
};

type StreamsResponse = {
  ok: boolean;
  streams?: XtreamStream[];
  message?: string;
};

export async function getLiveCategories(
  deviceId: string
): Promise<XtreamCategory[]> {
  const response = await CapacitorHttp.get({
    url: `${API_BASE_URL}/api/device/${deviceId}/live/categories`,
  });

  const data = response.data as CategoriesResponse;

  if (!data.ok || !data.categories) {
    throw new Error(
      data.message ?? "Unable to load live categories."
    );
  }

  return data.categories;
}

export async function getLiveChannels(
  deviceId: string
): Promise<ParsedChannel[]> {
  const [categories, response] = await Promise.all([
    getLiveCategories(deviceId),

    CapacitorHttp.get({
      url:
        `${API_BASE_URL}/api/device/${deviceId}` +
        `/live/streams`,
    }),
  ]);

  const data = response.data as StreamsResponse;

  if (!data.ok || !data.streams) {
    throw new Error(
      data.message ?? "Unable to load live channels."
    );
  }

  const categoryMap = new Map(
    categories.map((category) => [
      category.category_id,
      category.category_name,
    ])
  );

  return data.streams.map((stream) => ({
    id: String(stream.stream_id),

    name: stream.name,

    category:
      categoryMap.get(stream.category_id) ??
      "Other",

    logo: stream.stream_icon || "",

    streamUrl:
      `${API_BASE_URL}/api/device/${deviceId}` +
      `/live/play/${stream.stream_id}`,
  }));
}