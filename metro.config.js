const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ExecuTorch model files are bundled as binary assets (Story 2.2). Metro must
// treat `.pte` as an asset so `import model from "*.pte"` resolves to an asset id.
config.resolver.assetExts.push("pte");

module.exports = withNativewind(config);
