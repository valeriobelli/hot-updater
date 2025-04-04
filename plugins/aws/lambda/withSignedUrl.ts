import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import type { UpdateInfo } from "@hot-updater/core";

interface WithSignedUrlProps<B extends UpdateInfo> {
  cdnHost: string;
  keyPairId: string;
  privateKey: string;
  reqUrl: string;
  updateInfo: B;
}

type WithSignedUrlReturn<B extends UpdateInfo> = Omit<B, "fileUrl"> & {
  fileUrl: string | null;
};

/**
 * Creates a CloudFront signed URL based on the provided update information.
 */
export const withSignedUrl = <B extends UpdateInfo>({
  cdnHost,
  keyPairId,
  privateKey,
  reqUrl,
  updateInfo,
}: WithSignedUrlProps<B>): WithSignedUrlReturn<B> => {
  const key = `${updateInfo.id}/bundle.zip`;

  const url = new URL(reqUrl);

  // We need to override the host to the CDN host because the reqUrl may be S3 URL given we are attaching this
  // Lambda@edge to Origin Request events. This is to ensure that the signed URL is generated for the CDN,
  // given we are signing the URL using the CDN's keygroup.
  url.host = cdnHost;
  url.pathname = `/${key}`;

  const signedUrl = getSignedUrl({
    url: url.toString(),
    keyPairId: keyPairId,
    privateKey: privateKey,
    dateLessThan: new Date(Date.now() + 60 * 1000).toISOString(), // Valid for 60 seconds
  });

  return { ...updateInfo, fileUrl: signedUrl };
};
