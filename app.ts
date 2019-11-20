import {app, BrowserWindow} from 'electron'
import Main from './server/main'

Main.main(app, BrowserWindow)
