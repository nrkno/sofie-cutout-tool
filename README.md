# Electron test for cutout prototype

## For Developers

### Installation

- `npm install --no-optional`

### Usage

### External dependencies

#### CasparCG

This tool is intended to be run along with the [NRK-version of CasparCG](https://github.com/nrkno/tv-automation-casparcg-server/releases)
CasparCG should be set up with 2 channels, one for Program output, and one for the image-provider, see below.

#### casparCG-image-provider

To get in-app video for the sources you will also need to run the [Caspar CG Image Provider](https://github.com/SuperFlyTV/casparCG-image-provider)

##### Extra CasparCG setup for the image provider

The image provider app needs an extra (empty) channel in CasparCG.

Additionally, you must set a full path to the media folder in the CasparCG configuration. Relative paths (typically `/media`) won't suffice.

### Development

Run app locally (for development purposes)
`npm run watch`

<!--
## Pack into executable

`npm run dist`
-->
