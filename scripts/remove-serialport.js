import trash from 'trash'

export default async () => {
	await trash(['node_modules/@serialport', 'node_modules/serialport'])
}
