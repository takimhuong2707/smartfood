import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function getWindowMs() {
  const val = Number(process.env.RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(val) && val > 0 ? val : DEFAULT_WINDOW_MS;
}

function getMax(envKey, fallback) {
  const val = Number(process.env[envKey]);
  return Number.isFinite(val) && val > 0 ? val : fallback;
}

function isRateLimitDisabled() {
  return process.env.DISABLE_RATE_LIMIT === 'true';
}

export const authLimiter = rateLimit({
  windowMs: getWindowMs(),
  limit: () => getMax('RATE_LIMIT_AUTH_MAX', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isRateLimitDisabled(),
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ip}:${email}`;
  },
  handler: (_req, res) => {
    res.status(429).json({ message: 'Quá nhiều lần thử, vui lòng thử lại sau ít phút' });
  },
});

export const adminLimiter = rateLimit({
  windowMs: getWindowMs(),
  limit: () => getMax('RATE_LIMIT_ADMIN_MAX', 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitDisabled(),
  keyGenerator: (req) => String(req.user?.id || ipKeyGenerator(req)),
  handler: (_req, res) => {
    res.status(429).json({ message: 'Quá nhiều yêu cầu quản trị, vui lòng thử lại sau ít phút' });
  },
});

export const adminHeavyLimiter = rateLimit({
  windowMs: getWindowMs(),
  limit: () => getMax('RATE_LIMIT_ADMIN_HEAVY_MAX', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitDisabled(),
  keyGenerator: (req) => String(req.user?.id || ipKeyGenerator(req)),
  handler: (_req, res) => {
    res.status(429).json({ message: 'Thao tác xuất dữ liệu hoặc làm mới quá nhanh, vui lòng thử lại sau' });
  },
});

export const adminStatsRefreshLimiter = rateLimit({
  windowMs: getWindowMs(),
  limit: () => getMax('RATE_LIMIT_ADMIN_HEAVY_MAX', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isRateLimitDisabled()) return true;
    const r = req.query?.refresh;
    return !(r === '1' || r === 'true');
  },
  keyGenerator: (req) => String(req.user?.id || ipKeyGenerator(req)),
  handler: (_req, res) => {
    res.status(429).json({ message: 'Làm mới thống kê quá nhiều lần, vui lòng thử lại sau' });
  },
});
