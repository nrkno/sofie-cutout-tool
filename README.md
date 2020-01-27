# Electron test for cutout prototype

## For Developers

### Installation

- `npm install --no-optional`

### Usage

### External dependencies

#### CasparCG

You need to set up a CasparCG server running with 2 channels with screen consumers.

#### casparCG-image-provider

To get in-app video for the sources you will also need to run the [Caspar CG Image Provider](https://github.com/SuperFlyTV/)

##### Extra CasparCG setup for the image provider

The image provider app needs an extra channel in Casper. This channel does not need to have any consumers.

Additionally, you must set a full path to the media folder in the Caspar configuration. Relative paths (typically `/media`) won't suffice.

The media folder also needs to have a sub folder named `snaps`. If it doesn't exist you must create it manually.

Run app locally (for development purposes)
`npm run watch`

## Pack into executable

`npm run build`
