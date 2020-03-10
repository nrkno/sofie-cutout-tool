import packager from 'electron-packager';
import { readFileSync } from 'fs';
import { makeRe } from 'micromatch';
import rimraf from 'rimraf';
import cpr from 'cpr';

const ignore = readFileSync('./.packageignore', 'utf-8')
	.split(/\r?\n/)
	.map((glob) => glob.trim())
	.filter((glob) => glob !== '')
	.map(makeRe);

const options = {
	dir: 'build',
	icon: 'assets/sofie_logo',
	ignore,
	out: 'dist',
	overwrite: true,
	prune: true,
	quiet: false
};

console.log('Packaging app bundles...');

wipeDir(options.out)
	.then(() => {
		return copyFrontendFiles(options.dir);
	})
	.then(() => {
		return packager(options);
	})
	.then((appPaths) => {
		console.log('Created bundles:', appPaths.join('\n'));
		return true;
	});

async function wipeDir(dirName) {
	console.log(`Wiping ${dirName}...`);
	return new Promise((resolve, reject) => {
		rimraf(dirName, (err) => {
			if (err) {
				console.error('Directory wipe failed!');
				reject(err);
			}

			console.log(`${dirName} wiped.`);
			resolve();
		});
	});
}

async function copyFrontendFiles(targetDir) {
	const dirsToCopy = ['assets', 'client', 'components', 'lib', 'shared'];

	return Promise.all(
		dirsToCopy.map((dirName) => {
			return new Promise((resolve, reject) => {
				cpr(
					dirName,
					`${targetDir}/${dirName}`,
					{ deleteFirst: true, overwrite: true, confirm: true },
					(err) => {
						if (err) {
							reject(err);
						}

						resolve();
					}
				);
			});
		})
	);
}
