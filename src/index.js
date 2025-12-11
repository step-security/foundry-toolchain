const core = require("@actions/core");
const toolCache = require("@actions/tool-cache");
const path = require("path");
const axios = require('axios');

const { restoreRPCCache } = require("./cache");
const { getDownloadObject } = require("./utils");

async function validateSubscription() {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;

  try {
    await axios.get(API_URL, {timeout: 3000});
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error(
        'Subscription is not valid. Reach out to support@stepsecurity.io'
      );
      process.exit(1);
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.');
    }
  }
}

async function main() {
  try {
    await validateSubscription();

    // Get version and network input
    const version = core.getInput("version");
    const network = core.getInput("network");

    // Download the archive containing the binaries
    const download = getDownloadObject(version, network);
    core.info(`Downloading Foundry '${version}' (${network}) from: ${download.url}`);
    const pathToArchive = await toolCache.downloadTool(download.url);

    // Extract the archive onto host runner
    core.debug(`Extracting ${pathToArchive}`);
    const extract = download.url.endsWith(".zip") ? toolCache.extractZip : toolCache.extractTar;
    const pathToCLI = await extract(pathToArchive);

    // Expose the tool
    core.addPath(path.join(pathToCLI, download.binPath));

    // Get cache input
    const cache = core.getBooleanInput("cache");

    // If cache input is false, skip restoring cache
    if (!cache) {
      core.info("Cache not requested, not restoring cache");
      return;
    }

    // Restore the RPC cache
    await restoreRPCCache();
  } catch (err) {
    core.setFailed(err);
  }
}

module.exports = main;

if (require.main === module) {
  main();
}
