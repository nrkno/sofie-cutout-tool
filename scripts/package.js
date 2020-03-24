import packager from 'electron-packager'
import { readFileSync } from 'fs'
import { isMatch } from 'micromatch'
import rimraf from 'rimraf'
import cpr from 'cpr'

const dirs = {
	BUILD: 'build',
	DIST: 'dist',
	CONFIG: 'config'
}

const projectConfig = JSON.parse(readFileSync('./package.json', 'utf-8'))

const ignoreGlobs = readFileSync('./.packageignore', 'utf-8')
	.split(/\r?\n/)
	.map((glob) => glob.trim())
	.filter((glob) => glob !== '' || glob.startsWith('#'))

const options = {
	afterCopy: [
		async (buildPath, version, platform, arch, callback) => {
			await copyCompiledTypescriptFiles(buildPath)
			callback()
		}
	],
	arch: projectConfig.cpu,
	asar: {
		unpackDir: dirs.CONFIG
	},
	dir: '.',
	icon: 'assets/sofie_logo',
	ignore: (fileName) => {
		// filenames sent in starts with /, which confuses the matcher
		return isMatch(fileName.substring(1), ignoreGlobs, { basename: false })
	},
	out: dirs.DIST,
	overwrite: true,
	platform: projectConfig.os,
	prune: true,
	quiet: false
}

console.log('Packaging app bundles...')

wipeDir(dirs.DIST)
	.then(async () => {
		try {
			const appPaths = packager(options)
			return appPaths
		} catch (err) {
			console.log('Error while packaging:', err)
			throw new Error(err)
		}
	})
	.then((appPaths) => {
		console.log('Created bundles:', appPaths.join('\n'))
		return true
	})
	.catch((error) => {
		console.log('Packaging failed:', error)
	})

async function wipeDir(dirName) {
	console.log(`Wiping ${dirName}...`)
	return new Promise((resolve, reject) => {
		rimraf(dirName, (err) => {
			if (err) {
				console.error('Directory wipe failed!')
				reject(err)
				return false
			}

			console.log(`${dirName} wiped.`)
			resolve()
		})
	})
}

async function copyCompiledTypescriptFiles(targetDir) {
	console.log(`Copying compiled TypeScript from ${dirs.BUILD} to ${targetDir}`)

	return new Promise((resolve, reject) => {
		cpr(
			dirs.BUILD,
			`${targetDir}/${dirs.BUILD}`,
			{ deleteFirst: true, overwrite: true, confirm: true },
			(err, files) => {
				if (err) {
					reject(err)
					return false
				}

				console.log(`Copied ${files.length} files`)
				resolve(files)
			}
		)
	})
}
