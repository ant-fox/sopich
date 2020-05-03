import { Display } from '../../../src/display.js'
import { Audio } from '../../../src/audio.js'

import { debounce } from 'throttle-debounce';
import { getCurrentState } from './state';

const NO_RENDER = false
const INTERVAL_RENDER = false

// display 
const display = new Display()
if ( NO_RENDER ){
} else if (  INTERVAL_RENDER ){
    setInterval( () => display.display(), 1000 )
} else {
    display.animate()
}

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

let renderInterval
if ( NO_RENDER ){
} else {
    renderInterval = setInterval(renderMainMenu, 1000 / 60);
}

// Replaces main menu rendering with game rendering.
export function startRendering() {
    if ( NO_RENDER ){
    } else {
        audio.start()
        clearInterval(renderInterval);
        renderInterval = setInterval(render, 1000 / 60);
    }
}

// Replaces game rendering with main menu rendering.
export function stopRendering() {
    if ( NO_RENDER ){
    } else {
        audio.stop()
        clearInterval(renderInterval);
        renderInterval = setInterval(renderMainMenu, 1000 / 60);
    }
}
