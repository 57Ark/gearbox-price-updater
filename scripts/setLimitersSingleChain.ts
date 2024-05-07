import { setLimiters } from "../utils/setLimiters";

async function main() {
  const [, , chainId] = process.argv;

  await setLimiters(chainId);
}

main();
