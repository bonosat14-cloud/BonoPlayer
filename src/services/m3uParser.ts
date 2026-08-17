export type ParsedChannel = {
  id: string;
  name: string;
  category: string;
  logo: string;
  streamUrl: string;
};

function readAttribute(
  line: string,
  attribute: string
) {
  const match = line.match(
    new RegExp(`${attribute}="([^"]*)"`, "i")
  );

  return match?.[1]?.trim() ?? "";
}

export function parseM3U(
  content: string
): ParsedChannel[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ParsedChannel[] = [];

  let currentInfo = "";

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      currentInfo = line;
      continue;
    }

    if (
      currentInfo &&
      !line.startsWith("#")
    ) {
      const commaIndex =
        currentInfo.lastIndexOf(",");

      const name =
        commaIndex !== -1
          ? currentInfo
              .slice(commaIndex + 1)
              .trim()
          : "Unknown Channel";

      const category =
        readAttribute(
          currentInfo,
          "group-title"
        ) || "Other";

      const logo =
        readAttribute(
          currentInfo,
          "tvg-logo"
        );

      const tvgId =
        readAttribute(
          currentInfo,
          "tvg-id"
        );

      result.push({
        id:
          tvgId ||
          `channel-${result.length + 1}`,
        name,
        category,
        logo,
        streamUrl: line,
      });

      currentInfo = "";
    }
  }

  return result;
}