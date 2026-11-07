import './style.css'
import { mountGame } from './game/mountGame.ts'

const root = document.querySelector<HTMLElement>('#app')
if (root) void mountGame(root)
