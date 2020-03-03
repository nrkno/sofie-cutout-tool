import packager from 'electron-packager';
import { readFileSync } from 'fs';
import { makeRe } from 'micromatch';

const ignoreGlobs = readFileSync('../.packageignore', 'utf-8')
	.split(/\r?\n/)
	.map((glob) => glob.trim())
	.filter((glob) => glob !== '');

const options = {
	dir: 'build',
	icon: 'assets/sofie_logo',
	ignore: ignoreGlobs.map(makeRe),
	out: 'dist',
	overwrite: true,
	prune: true
};

packager(options).then((appPaths) => {
	console.log('Created Electron bundles:', appPaths.join('\n'));
});
