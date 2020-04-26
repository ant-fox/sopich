import { sendInputToServer } from './networking';
import { Controller } from '../../../src/controller.js'

function onInput( input ){
    sendInputToServer( input )
}
const controller = new Controller( onInput )

export function startCapturingInput() {
    controller.connect()
}
export function stopCapturingInput() {
    controller.disconnect()
}
