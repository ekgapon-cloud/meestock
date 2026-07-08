import rateLimit from "express-rate-limit";

/** Brute-force guard on login: 10 attempts per IP per 15 minutes, successful logins don't count against the limit. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many login attempts, please try again later" } },
});
