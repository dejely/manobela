import { mapNetworkErrorMessage } from './network-error';
import { getErrorText } from './getError';

/**
 * Fetches ICE servers from the backend.
 */
export async function fetchIceServers({
  apiBaseUrl,
}: {
  apiBaseUrl: string;
}): Promise<RTCConfiguration> {
  let res: Response;

  try {
    res = await fetch(`${apiBaseUrl}/ice-servers`);
  } catch (err: any) {
    const friendly = mapNetworkErrorMessage(getErrorText(err));
    const error = new Error(friendly);
    (error as { cause?: unknown }).cause = err;
    throw error;
  }

  if (!res.ok) {
    let bodyText: string | undefined;
    try {
      bodyText = await res.text();
    } catch {
      // ignore
    }

    const friendly = mapNetworkErrorMessage(
      bodyText || res.statusText || `HTTP ${res.status}`,
      res.status
    );

    const error = new Error(friendly);
    (error as { cause?: unknown }).cause = {
      status: res.status,
      statusText: res.statusText,
      body: bodyText,
    };
    throw error;
  }

  const data = await res.json();

  return {
    iceServers: data.iceServers.map((s: any) => {
      const server: any = { urls: s.urls };
      if (s.username && s.credential) {
        server.username = s.username;
        server.credential = s.credential;
      }
      return server;
    }),
  };
}
