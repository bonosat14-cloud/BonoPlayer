import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  API_BASE_URL,
} from "../config/api";

const GUIDE_CACHE_MS =
  2 * 60 * 1000;

export type EpgProgram = {
  title: string;
  description: string;
  start: string;
  end: string;
  startTimestamp: number;
  endTimestamp: number;
};

export type EpgMatchedChannel = {
  channelId: string;
  displayName: string;
};

export type EpgGuide = {
  matchedChannel:
    | EpgMatchedChannel
    | null;

  now:
    | EpgProgram
    | null;

  /*
   * نحافظ عليهم للتوافق
   * مع أي كود قديم.
   */
  next:
    | EpgProgram
    | null;

  later:
    | EpgProgram
    | null;

  /*
   * البرامج المقبلة.
   * Backend يرسل حتى 5.
   */
  upcoming:
    EpgProgram[];
};

type EpgGuideResponse = {
  ok: boolean;

  matchedChannel?:
    | EpgMatchedChannel
    | null;

  now?:
    | EpgProgram
    | null;

  next?:
    | EpgProgram
    | null;

  later?:
    | EpgProgram
    | null;

  upcoming?:
    EpgProgram[];

  message?: string;
};

type CachedGuide = {
  updatedAt: number;
  guide: EpgGuide;
};

const memoryCache =
  new Map<
    string,
    CachedGuide
  >();

function getCacheKey(
  deviceId: string,
  channelName: string,
  epgId?: string
) {
  return [
    deviceId,
    epgId ?? "",
    channelName
      .trim()
      .toLowerCase(),
  ].join("|");
}

export async function getChannelGuide(
  deviceId: string,
  channelName: string,
  epgId?: string
): Promise<EpgGuide> {
  const cacheKey =
    getCacheKey(
      deviceId,
      channelName,
      epgId
    );

  const cached =
    memoryCache.get(
      cacheKey
    );

  if (
    cached &&
    Date.now() -
      cached.updatedAt <
      GUIDE_CACHE_MS
  ) {
    return cached.guide;
  }

  const params =
    new URLSearchParams();

  params.set(
    "name",
    channelName
  );

  if (epgId) {
    params.set(
      "epgId",
      epgId
    );
  }

  const response =
    await CapacitorHttp.get({
      url:
        `${API_BASE_URL}` +
        `/api/device/${deviceId}` +
        `/epg/xmltv/guide?` +
        params.toString(),
    });

  const data =
    response.data as
      EpgGuideResponse;

  if (!data.ok) {
    throw new Error(
      data.message ??
        "Unable to load EPG."
    );
  }

  const upcoming =
    Array.isArray(
      data.upcoming
    )
      ? data.upcoming
      : [
          data.next,
          data.later,
        ].filter(
          (
            program
          ): program is EpgProgram =>
            Boolean(program)
        );

  const guide: EpgGuide = {
    matchedChannel:
      data.matchedChannel ??
      null,

    now:
      data.now ??
      null,

    next:
      data.next ??
      upcoming[0] ??
      null,

    later:
      data.later ??
      upcoming[1] ??
      null,

    upcoming,
  };

  memoryCache.set(
    cacheKey,
    {
      updatedAt:
        Date.now(),

      guide,
    }
  );

  return guide;
}

export function getProgramProgress(
  program:
    | EpgProgram
    | null,
  now = Date.now()
): number {
  if (!program) {
    return 0;
  }

  const duration =
    program.endTimestamp -
    program.startTimestamp;

  if (duration <= 0) {
    return 0;
  }

  const progress =
    (
      (
        now -
        program.startTimestamp
      ) /
      duration
    ) *
    100;

  return Math.max(
    0,
    Math.min(
      100,
      progress
    )
  );
}

export function formatEpgTime(
  timestamp: number
): string {
  if (!timestamp) {
    return "--:--";
  }

  return new Date(
    timestamp
  ).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}