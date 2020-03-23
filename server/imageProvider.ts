import { Settings } from './api'

export function getImageProviderLocation(settings: Settings) {
	const protocol = settings.imageProvider.protocol ? `${settings.imageProvider.protocol}://` : ''
	const port = settings.imageProvider.port ? `:${settings.imageProvider.port}` : ''

	return `${protocol}${settings.imageProvider.hostname}${port}`
}
