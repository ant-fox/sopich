const {Builder, By, Key, until, Action} = require('selenium-webdriver');
// const SERVER = 'http://sopich.herokuapp.com/'
const SERVER = 'http://localhost:3000'
const CLIENTS_COUNT = 2
const BIG_SLEEP = 5000
const STEP_SLEEP = 30

function Controls( driver ){
    function keyDown( k ){
        return () => driver.actions()/*.click(element).*/.keyDown( k ).perform()
    }
    return {
        'noseup' : keyDown('i'),
        'nosedown' : keyDown('k'),
        'reverse' : keyDown('l'),
        'powerup'  : keyDown('e'),
        'powerdown': keyDown('r'),
        'firemissile': keyDown('m'),
        'firebomb': keyDown('p'),
        'fireguidedmissile': keyDown(Key.RETURN),
    }
}


async function example( username, width, height ) {

        
    let driver = await new Builder().forBrowser('firefox').build();
    try {

        const controls = Controls( driver )
        /*
         * login
         */
        await driver.get( SERVER );
        await driver.findElement(By.name('username')).sendKeys(username);
        await driver.findElement(By.name('password')).sendKeys(username+'Pwd', Key.RETURN); 
        await driver.sleep( BIG_SLEEP )

        /*
         * start
         */
        const playButton = await driver.wait(until.elementLocated(By.id('play-button')));
        await driver.findElement(By.id('play-button')).click()
        await driver.sleep( BIG_SLEEP )
        //   await driver.manage().window().setSize( width, height );
        await driver.manage().window().setRect({width, height, x:0, y:0})
        await driver.sleep( BIG_SLEEP )
        
        /* 
         * play 
         */
        for ( let i = 0 ; i < 1000 ; i++ ){
            const controlTypes = Object.keys( controls )
            const controlType = controlTypes[ Math.floor( Math.random() * controlTypes.length ) ]
            controls[ controlType ]()
            await driver.sleep( STEP_SLEEP )
        }

    } catch( e ){
        console.log('ERREUR',e)
    } finally {
        await driver.quit();
    } 
}
new Array( CLIENTS_COUNT ).fill(0).forEach( (_,i) => {
    example( 'player_test_'+i, 400, 200 ).catch( e => console.log('error for',i,e) )
})
