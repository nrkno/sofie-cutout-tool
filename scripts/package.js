import packager from 'electron-packager'
import { readFileSync } from 'fs'
import { makeRe, isMatch } from 'micromatch'
import rimraf from 'rimraf'
import cpr from 'cpr'

const dirs = {
	BUILD: 'build',
	DIST: 'dist',
	CONFIG: 'config'
}

const ignoreGlobs = readFileSync('./.packageignore', 'utf-8')
	.split(/\r?\n/)
	.map((glob) => glob.trim())
	.filter((glob) => glob !== '')

console.log('ignores', ignoreGlobs.join('\n'))

const options = {
	// asar: {
	// 	unpackDir: dirs.CONFIG
	// }
	dir: dirs.BUILD,
	icon: 'assets/sofie_logo',
	ignore: (fileName) => {
		return isMatch(fileName, ignoreGlobs, { basename: true })
	},
	out: dirs.DIST,
	overwrite: true,
	prune: true,
	quiet: false
}

console.log('Packaging app bundles...')

wipeDir(dirs.DIST)
	.then(() => {
		return copyNodeModules(dirs.BUILD)
	})
	.then(() => {
		return copyFrontendFiles(dirs.BUILD)
	})
	.then(() => {
		return copyConfigFiles(dirs.BUILD)
	})
	.then(() => {
		return packager(options)
	})
	.then((appPaths) => {
		console.log('Created bundles:', appPaths.join('\n'))
		return true
	})

async function wipeDir(dirName) {
	console.log(`Wiping ${dirName}...`)
	return new Promise((resolve, reject) => {
		rimraf(dirName, (err) => {
			if (err) {
				console.error('Directory wipe failed!')
				reject(err)
			}

			console.log(`${dirName} wiped.`)
			resolve()
		})
	})
}

async function copyNodeModules(targetDir) {
	console.log(`Copying node_modules to ${targetDir}`)

	return new Promise((resolve, reject) => {
		cpr(
			'node_modules',
			`${targetDir}/node_modules`,
			{ deleteFirst: true, overwrite: true, confirm: true },
			(err) => {
				if (err) {
					reject(err)
				}

				resolve()
			}
		)
	})
}

async function copyFrontendFiles(targetDir) {
	const dirsToCopy = ['assets', 'client', 'components', 'lib', 'shared']
	console.log(`Copying ${dirsToCopy.join(',')} to ${targetDir}`)

	return Promise.all(
		dirsToCopy.map((dirName) => {
			return new Promise((resolve, reject) => {
				cpr(
					dirName,
					`${targetDir}/${dirName}`,
					{ deleteFirst: true, overwrite: true, confirm: true },
					(err) => {
						if (err) {
							reject(err)
						}

						resolve()
					}
				)
			})
		})
	)
}

async function copyConfigFiles(targetDir) {
	console.log(`Copying config files to ${targetDir}`)

	return new Promise((resolve, reject) => {
		cpr(
			'config',
			`${targetDir}/config`,
			{ deleteFirst: true, overwrite: true, confirm: true },
			(err) => {
				if (err) {
					reject(err)
				}

				resolve()
			}
		)
	})
}
