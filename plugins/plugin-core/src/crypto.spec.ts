import { constants, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateSigningKeys, sign } from "./crypto";

describe("signBundleId", () => {
  it("signs the bundle id using the defined private key", async () => {
    const { privateKey, publicKey } = await generateSigningKeys();

    const bundleId = "0195be69-e010-7438-b4ac-9a8cdb148b61";
    const signedBundleId = sign(bundleId, privateKey);

    const verify = createVerify("RSA-SHA256");

    verify.update(bundleId);
    verify.end();

    expect(
      verify.verify(
        {
          key: publicKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
        },
        signedBundleId,
        "base64",
      ),
    ).toBe(true);
  });
});
