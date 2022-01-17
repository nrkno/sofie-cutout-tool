# Sofie: The Modern TV News Studio Automation System (Electron test for Sofie cutout prototype)

## For Developers

### Installation

- `yarn install --ignore-optional`

### Usage

### External dependencies

This project uses [yarn](https://classic.yarnpkg.com/en/) for dependency management and running tasks. It should be installed globally prior to doing anything else. Note that this also goes for CI servers/containers.
If you already have Node/npm installed: `npm install -g yarn@1`

#### CasparCG

This tool is intended to be run along with the [NRK-version of CasparCG](https://github.com/nrkno/tv-automation-casparcg-server/releases)

CasparCG should be set up with 2 channels, one for program output, and one for the image-provider, see below.

#### CasparCG-image-provider

To get in-app video for the sources you will also need to run the [Caspar CG Image Provider](https://github.com/SuperFlyTV/casparCG-image-provider)

##### Extra CasparCG setup for the image provider

The image provider app needs an extra (empty) channel in CasparCG in order to stream previews to the web app.

### Development

Run app locally (for development purposes)
`yarn watch`

## Pack redistributable electron apps

`yarn package`
