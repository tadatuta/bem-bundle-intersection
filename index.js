const fs = require('fs');
const path = require('path');
const bemDecl = require('bem-decl');

module.exports = function getBundleIntersections(config = {}) {
    const levels = config.levels || [];

    return Promise.all(levels.map(level => getInnerDirs(level).then(bundles => {
        return Promise.all(bundles
            .map(bundle => bemDecl.load(path.join(level, bundle, bundle + '.bemdecl.js')))
        ).then(decls => {
            return decls.map((currentDecl, currentIdx) => {
                return decls.map((decl, idx) => {
                    if (currentIdx === idx) return;

                    const intersection = bemDecl.intersect(currentDecl, decl)
                        .filter(item => item.entity.block);

                    if (!intersection.length) return;

                    return {
                        level: level,
                        what: bundles[currentIdx],
                        with: bundles[idx],
                        by: intersection.map(intersection => intersection.entity)
                    };
                }).filter(Boolean);
            }).filter(i => i.length);
        });
    })))
    .then(flatten)
    .catch(console.error);
};

function flatten(arr) {
     return arr.reduce(function(acc, item) {
        return acc.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
}

function readdir(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) return reject(err);
            resolve(files);
        });
    });
}

function isDir(dir) {
    return new Promise((resolve, reject) => {
        fs.stat(dir, (err, stats) => {
            if (err) return reject(err);
            resolve(stats.isDirectory());
        });
    });
}

function getInnerDirs(dir) {
    return readdir(dir).then(files =>
        Promise.all(files.map(file => isDir(path.join(dir, file))))
            .then(flags => files.filter((file, idx) => flags[idx]))
    );
}
