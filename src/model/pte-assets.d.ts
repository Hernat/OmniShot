// Ambient declaration so TypeScript accepts `import model from "*.pte"`.
// Metro bundles `.pte` files as assets (see metro.config.js assetExts) and
// resolves the import to an asset id (number), which is a valid
// react-native-executorch `ResourceSource`. Story 2.2.
declare module "*.pte" {
  const asset: number;
  export default asset;
}
