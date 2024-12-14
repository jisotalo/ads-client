/** @type {import('jest').Config} */
const config = {
  // Enable worker threads for assertion failures involving BigInt
  // See https://github.com/jestjs/jest/issues/11617#issuecomment-1458155552
  //workerThreads: true,
  maxWorkers: 1,
};

module.exports = config;