import fs from "node:fs/promises";
import { printBanner } from "@/components/banner";
import * as p from "@clack/prompts";
import { generateSigningKeys, getCwd } from "@hot-updater/plugin-core";

export const genCodeSigningKeys = async () => {
  printBanner();

  const cwd = getCwd();

  const { privateKey, publicKey } = await generateSigningKeys();
  const privateKeyPath = `${cwd}/private.key`;
  const publicKeyPath = `${cwd}/public.key`;

  await fs.writeFile(privateKeyPath, privateKey);
  await fs.writeFile(publicKeyPath, publicKey);

  p.outro(`
🚀 Signing keys generated successfully
🔑 Private key saved to ${privateKey}
🔑 Public key saved to ${publicKey}
`);
};
