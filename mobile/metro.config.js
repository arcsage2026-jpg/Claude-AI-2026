const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from /shared, which lives outside this
// Expo project's default root (standard Metro monorepo pattern).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Without this, Metro's default hierarchical lookup walks up from files in
// /shared and finds the web app's own node_modules/react at the repo root
// first, producing two copies of React (mobile's + web's) and "invalid hook
// call" errors. Pin resolution to the explicit list above instead.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
