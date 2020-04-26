import { Display } from '../../../src/display.js'
import { Audio } from '../../../src/audio.js'

import { debounce } from 'throttle-debounce';
import { getCurrentState } from './state';

// display 
const display = new Display()
display.animate()

// sound
const audio = new Audio()


function render() {
    const ST = getCurrentState();
    display.setState( ST )
    audio.setState( ST )
    return;
}
function renderMainMenu() {
 /*
   const t = Date.now() / 7500;
   const x = MAP_SIZE / 2 + 800 * Math.cos(t);
   const y = MAP_SIZE / 2 + 800 * Math.sin(t);
   renderBackground(x, y);
 */
}

let renderInterval = setInterval(renderMainMenu, 1000 / 60);

// Replaces main menu rendering with game rendering.
export function startRendering() {
    audio.start()
    clearInterval(renderInterval);
    renderInterval = setInterval(render, 1000 / 60);    
}

// Replaces game rendering with main menu rendering.
export function stopRendering() {
    audio.stop()
  clearInterval(renderInterval);
  renderInterval = setInterval(renderMainMenu, 1000 / 60);
}
