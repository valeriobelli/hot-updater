import { NIL_UUID } from "@hot-updater/core";
import type {
  CloudFrontHeaders,
  CloudFrontRequestEvent,
  CloudFrontRequestHandler,
} from "aws-lambda";
import { Hono } from "hono";
import type { Callback, CloudFrontRequest } from "hono/lambda-edge";
import { handle } from "hono/lambda-edge";
import { createIs } from "typia";
import { getUpdateInfo } from "./getUpdateInfo";
import { withSignedUrl } from "./withSignedUrl";

declare global {
  var HotUpdater: {
    CLOUDFRONT_KEY_PAIR_ID: string;
    CLOUDFRONT_PRIVATE_KEY_BASE64: string;
  };
}

const CLOUDFRONT_KEY_PAIR_ID = HotUpdater.CLOUDFRONT_KEY_PAIR_ID;
const CLOUDFRONT_PRIVATE_KEY = Buffer.from(
  HotUpdater.CLOUDFRONT_PRIVATE_KEY_BASE64,
  "base64",
).toString("utf-8");

const isAndroidOrIOS = createIs<"android" | "ios">();

const getHeaderByName =
  (headers: CloudFrontHeaders) =>
  (headerName: string): string | undefined =>
    headers[headerName]?.[0]?.value;

type Bindings = {
  event: CloudFrontRequestEvent;
  callback: Callback;
  request: CloudFrontRequest;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/check-update", async (c) => {
  try {
    const { headers } = c.env.request;

    const getHeader = getHeaderByName(headers);

    const bundleId = getHeader("x-bundle-id");
    const appPlatform = getHeader("x-app-platform");
    const appVersion = getHeader("x-app-version");
    const minBundleId = getHeader("x-min-bundle-id") ?? NIL_UUID;
    const channel = getHeader("x-channel") ?? "production";
    const cdnHost = getHeader("x-forwarded-host");

    if (!bundleId || !isAndroidOrIOS(appPlatform) || !appVersion) {
      return c.json({ error: "Missing required headers." }, 400);
    }

    if (!cdnHost) {
      return c.json({ error: "Missing host header." }, 500);
    }

    const updateInfo = await getUpdateInfo({
      baseUrl: cdnHost,
      keyPairId: CLOUDFRONT_KEY_PAIR_ID,
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      platform: appPlatform,
      bundleId,
      appVersion,
      minBundleId,
      channel,
    });

    if (!updateInfo) {
      return c.json(null);
    }

    if (updateInfo.id === NIL_UUID) {
      return c.json({ ...updateInfo, fileUrl: null });
    }

    const appUpdateInfo = withSignedUrl({
      cdnHost,
      reqUrl: c.req.url,
      keyPairId: CLOUDFRONT_KEY_PAIR_ID,
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      updateInfo,
    });

    return c.json(appUpdateInfo);
  } catch {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("*", async (c) => {
  return c.env.callback(null, c.env.request);
});

export const handler = handle(app) as CloudFrontRequestHandler;
