export default {
    ignore: {
        src: ["~tests", "~"],
        dependencies: [],
        devDependencies: true,
        peerDependencies: true
    },
    ignoreDirs: ["node_modules/", "dist/", "build/"],
    packages: ["./"]
};
