import path from "path";
import getWorkspaces from "get-yarn-workspaces";

export default {
    ignore: {
        src: ["~tests", "~"],
        dependencies: [],
        devDependencies: true,
        peerDependencies: true
    },
    ignoreDirs: ["node_modules/", "dist/", "build/"],
    packages: getWorkspaces().map(pkg =>
        pkg.replace(/\//g, path.sep).replace(process.cwd() + path.sep, "")
    )
};
