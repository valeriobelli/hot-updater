import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import {
  type Bundle,
  type GetBundlesArgs,
  NIL_UUID,
  type UpdateInfo,
} from "@hot-updater/core";
import {
  filterCompatibleAppVersions,
  getUpdateInfo as getUpdateInfoJS,
} from "@hot-updater/js";
import { createIs } from "typia";

const isStringArray = createIs<string[]>();
const isBundleArray = createIs<Bundle[]>();

interface GetCdnJsonProps<R> {
  baseUrl: string;
  decoder: (data: unknown) => data is R;
  objectKey: string;
  keyPairId: string;
  privateKey: string;
}

const getCdnJson = async <R>({
  baseUrl,
  decoder,
  objectKey,
  keyPairId,
  privateKey,
}: GetCdnJsonProps<R>): Promise<R | null> => {
  try {
    const url = new URL(baseUrl);

    url.pathname = `/${objectKey}`;

    const signedUrl = getSignedUrl({
      url: url.toString(),
      keyPairId: keyPairId,
      privateKey: privateKey,
      dateLessThan: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    const res = await fetch(signedUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const result = await res.json();

    if (!decoder(result)) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
};

interface GetUpdateInfoProps extends GetBundlesArgs {
  baseUrl: string;
  keyPairId: string;
  privateKey: string;
}

export const getUpdateInfo = async ({
  appVersion,
  baseUrl,
  bundleId,
  channel = "production",
  keyPairId,
  minBundleId = NIL_UUID,
  platform,
  privateKey,
}: GetUpdateInfoProps): Promise<UpdateInfo | null> => {
  const targetAppVersions = await getCdnJson<string[]>({
    baseUrl,
    decoder: isStringArray,
    keyPairId,
    objectKey: `${channel}/${platform}/target-app-versions.json`,
    privateKey,
  });

  const matchingVersions = filterCompatibleAppVersions(
    targetAppVersions ?? [],
    appVersion,
  );

  const results = await Promise.allSettled(
    matchingVersions.map((targetAppVersion) =>
      getCdnJson<Bundle[]>({
        baseUrl,
        decoder: isBundleArray,
        keyPairId,
        objectKey: `${channel}/${platform}/${targetAppVersion}/update.json`,
        privateKey,
      }),
    ),
  );

  const bundles = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value ?? []);

  return getUpdateInfoJS(bundles, {
    platform,
    bundleId,
    appVersion,
    minBundleId,
    channel,
  });
};
