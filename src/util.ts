import { Axios, AxiosResponse } from "axios";
import { logger } from "./logger";

/**
 * Intercepts the requests and headers to attempt to conform
 * to github's rate limiting strategies.
 * https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting
 *
 * @param axios to decorate with interceptors
 * @returns
 */
export function githubRateLimit(axios: Axios) {
  // by default don't rate limit
  // this is kind of risky, as already first request might be blocked
  let limit = 0;
  let remaining = Number.MAX_SAFE_INTEGER;

  // rate limit times
  let resetTime: string | null = null;
  let resetTimeout: NodeJS.Timeout | undefined;
  let requestQueue: (() => void)[] = [];

  axios.interceptors.request.use(
    async (request) =>
      new Promise((resolve) => {
        remaining -= 1;
        if (limit <= 0 || (remaining > 0 && limit > 0)) {
          resolve(request);
        } else {
          requestQueue.push(() => {
            resolve(request);
          });
        }
      })
  );

  const updateLimits = (response: AxiosResponse) => {
    if (response && response.headers?.["x-ratelimit-limit"]) {
      const headerLimit = response.headers?.["x-ratelimit-limit"];
      const headerRemaining = response.headers?.["x-ratelimit-remaining"];
      const headerResetTime = response.headers?.["x-ratelimit-reset"];

      // set the limit to how it should be
      limit = headerLimit ? Number(headerLimit) : 0;
      remaining = Math.min(headerRemaining ? Number(headerRemaining) : limit, remaining);

      logger.debug({ headers: response.headers, limit, remaining }, "Github response headers parsed");

      // google moves the reset window between requests
      // make sure we keep up with it
      if (headerResetTime && (!resetTime || resetTime !== headerResetTime) && limit !== 0) {
        clearTimeout(resetTimeout);
        resetTime = headerResetTime;

        logger.debug({ resetTime }, "Planning reset");
        resetTimeout = setTimeout(() => {
          resetTime = null; // next response should set the next window's end
          logger.debug({ headerResetTime }, "At the reset window's end, releasing requests");
          // unblock limit number of requests. At this point there should be no
          const unblockRequests = requestQueue.slice(0, limit);
          requestQueue = requestQueue.slice(limit);
          remaining = limit - unblockRequests.length;
          unblockRequests.forEach((resolveFn) => resolveFn());
        }, Number(headerResetTime) * 1000 - Date.now() + 1000 /* 1s buffer */);
      }
    }
  };

  axios.interceptors.response.use((response) => {
    updateLimits(response);
    return response;
  });

  return axios;
}
