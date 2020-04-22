const css = `<style>

body, input[type="submit"] {
  background-color : black;
  color : white;
  font-family : monospace;  
  font-size : 10px;
  
}
input[type="submit"] {
  border : 5px solid orange;
  background-color : orange;
  color : black;
  border-radius : 8px;
  margin-top : 1em;
}
input[type="text"], input[type="password"]  {
  border : 0px;
  margin : 0.5em;
  font-family : monospace;  
  font-size : 10px;
  
}
input {
  
}
div {
  align-self: center;
}
div.connected {
  //background-color : red;
  font-size : 20px;
}
div.logout {
  //background-color : maroon;
  
}
div.delete{
  //background-color : blue;
}
div.login {
  //background-color : yellow;
}
</style>`;


export function loginPage( user, errors ){
    const userBlock = (user)?(
        `<div class="connected"><p>connected as ${ user.username }</p></div>`
    ):''
    let errorBlock = (errors.length)?([
        '<div class="error">',
        '<p>Could not !</p>',
        '<ul>'+errors.map( e => '<li>'+e+'</li>' )+'</ul>',
        '</div>',
    ].join("\n")):''
    const proceedBlock = user?([
        '<div class="proceed">',
        '<form action="/" method="get">',
        '<div><input type="submit" value="Proceed"/></div>',
        '</div>',
        '</form>',
    ].join("\n")):''
    const logoutBlock = user?([
        '<div class="logout">',
        '<form action="/logout" method="get">',
        '<div><input type="submit" value="Logout"/></div>',
        '</form>',
        '</div>',
    ].join("\n")):''            
    const deleteUserBlock = user?([
        '<div class="delete">',
        '<form action="/delete" method="post">',
        '<div><input type="submit" value="Delete User"/></div>',
        '</div>',
        '</form>',
    ].join("\n")):''
    const loginBlock = user?'':([
        '<div class="login">',
        '<form action="/login" method="post">',
        '<div><label>Username:</label><input type="text" name="username"/></div>',
        '<div><label>Password:</label><input type="password" name="password"/></div>',
        '<div><input type="submit" value="Log In / Register"/>',
        '</div>',
        '</form>',
        '</div>',
        
    ].join("\n"))
    let passBlock
    let html = [
        '<html>',
        '<head>',
        css,
        '</head>',
        '<body>',
        userBlock,
        errorBlock,
        proceedBlock,
        logoutBlock,
        deleteUserBlock,
        loginBlock,
        '</body>',
        '</html>'
    ]
    return html.join("\n")
}
