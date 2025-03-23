import { generateKeyPair as generateKeyPairCallbackAsync } from "node:crypto";
import { promisify } from "node:util";

const generateKeyPair = promisify(generateKeyPairCallbackAsync);

export const generateSigningKeys = () =>
  generateKeyPair("rsa-pss", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
