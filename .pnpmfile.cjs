function readPackage(pkg, context) {
  if (pkg.peerDependencies && pkg.name && pkg.name.startsWith('@radix-ui/')) {
    delete pkg.peerDependencies.react;
    delete pkg.peerDependencies['react-dom'];
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
