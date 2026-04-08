import { config } from "./config";
import type { SeerrResponse, MediaStatus, MediaRequestStatus } from "@/types";

async function seerrFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${config.seerr.url}/api/v1${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.seerr.apiKey,
      ...options.headers,
    },
  });
}

/**
 * Request a movie or TV show through Overseerr/Jellyseerr.
 */
export async function requestMedia(
  tmdbId: number,
  mediaType: "movie" | "tv",
  seasons?: number[]
): Promise<SeerrResponse> {
  try {
    const body: Record<string, unknown> = {
      mediaType,
      mediaId: tmdbId,
    };

    // For TV shows, include seasons if specified
    if (mediaType === "tv" && seasons && seasons.length > 0) {
      body.seasons = seasons;
    }

    const res = await seerrFetch("/request", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        success: false,
        message:
          body?.message || `Request failed with status ${res.status}`,
      };
    }

    return { success: true, message: "Request submitted successfully" };
  } catch (err) {
    console.error("Seerr request error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Check the availability / request status of a title in Overseerr/Jellyseerr.
 */
export async function getMediaStatus(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<MediaStatus> {
  try {
    const res = await seerrFetch(`/${mediaType}/${tmdbId}`);

    if (!res.ok) {
      return { id: tmdbId, mediaType, status: "unknown" };
    }

    const data = await res.json();

    // Overseerr mediaInfo.status values:
    // 1 = unknown, 2 = pending, 3 = processing, 4 = partially available, 5 = available
    let status: MediaRequestStatus = "unknown";
    if (data.mediaInfo) {
      switch (data.mediaInfo.status) {
        case 2:
          status = "pending";
          break;
        case 3:
          status = "approved";
          break;
        case 4:
        case 5:
          status = "available";
          break;
        default:
          status = "unknown";
      }

      // Also check for pending requests
      if (
        status === "unknown" &&
        data.mediaInfo.requests?.length > 0
      ) {
        status = "pending";
      }
    }

    return { id: tmdbId, mediaType, status };
  } catch (err) {
    console.error(`Seerr status check error for ${mediaType}/${tmdbId}:`, err);
    return { id: tmdbId, mediaType, status: "unknown" };
  }
}
