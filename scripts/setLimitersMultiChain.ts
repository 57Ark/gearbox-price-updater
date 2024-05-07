import { NETWORKS } from "../utils/constants";
import { setLimiters } from "../utils/setLimiters";

async function main() {
  for (const network of NETWORKS) {
    try {
      await setLimiters(network.chainId);
    } catch (e) {
      console.log(
        `\x1b[31mFailed to set limiters on ${network.name} reason:\x1b[0m`,
      );
      console.log(e);
    }
    console.log("\n\n\n");
  }
}

main();
