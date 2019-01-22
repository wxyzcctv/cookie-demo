var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]
var md5 = require('md5');

if(!port){
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

let sessions = {

}

var server = http.createServer(function(request, response){
  var parsedUrl = url.parse(request.url, true)
  var pathWithQuery = request.url 
  var queryString = ''
  if(pathWithQuery.indexOf('?') >= 0){ queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
  var path = parsedUrl.pathname
  var query = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/

  console.log('方方说：含查询字符串的路径\n' + pathWithQuery)

  if(path === '/js/main.js'){
    let string = fs.readFileSync('./js/main.js','utf8')
    response.setHeader('Content-Type', 'application/javascript;charset=utf-8')
    let fileMd5 = md5(string)
    response.setHeader('ETag', fileMd5)
    if(request.headers['if-none-match'] === fileMd5){
      response.statusCode = 304
      // 表示没有改变，这里就没有响应体
    }else{//如果已经发生改变了就请求下面的这些东西
      response.write(string)
    }
    response.end()
  }else if(path === '/css/default.css'){
    let string = fs.readFileSync('./css/default.css','utf8')
    response.setHeader('Content-Type','text/css;charset=utf-8')
    response.setHeader('Cache-Control', 'max-age=30')
    response.write(string)
    response.end()
  }else if(path === '/'){
    let string = fs.readFileSync('./index.html','utf8')
    let cookies = ''
    if(request.headers.cookie){
      cookies = request.headers.cookie.split('; ')
    }
    //获得响应头，将响应头中的cookie单独拿出来进行分裂。那么将会出现如下事例结果
    //['email=1@qqc.om', 'a=1', 'b=2']
    let hash = {}
    for(i=0;i<cookies.length;i++){
      let parts = cookies[i].split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value
    }
    //此处的hash列表中的数组中的key已经变为了随机数字sessionId
    let mySession = sessions[hash.sessionId]
    console.log(mySession)
    let email
    if(mySession){
      email = mySession.sign_in_email
    }
    // 这个时候是得到的是cookie中的email，
    let users = fs.readFileSync('./db/users','utf8')
    users = JSON.parse(users)  // 得到了数据文件中的字符串之后需要转换为JSON格式才能进行后面的操作
    let foundUser
    for(let i=0;i<users.length;i++){
      if(users[i].email === email){ //这个时候得将得到的cookie的email和数据文件中的email进行对比
        foundUser = users[i]        //如果能匹配数据库中的一个email就说明是已经注册过的
        break
      }
    }
    if(foundUser){  //这里举了一个得到cookie的email和数据文件中的email匹配的时候就显示这个用户的密码
      string = string.replace('__password__',foundUser.password)
      // 这个string就是跳转到主页面的时候得到的整个网页面的代码，替换其中的一串字符串的内容为用户的密码
      // 就能显示用户的密码了，这个例子是这么举的，但实际中是不允许这样做的。
    }else{ // 如果没有找到这个用户，那么就得不到密码，其实找不到这个用户就不会跳转，
      // 下面这句话只能是在首页中添加cookie的时候有用到，没什么实际意义
      string = string.replace('__password__','不知道')
    }
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }else if(path === '/sign_up' && method === 'GET'){
    // 这里需要满足的是前端发送的是GET请求才能有下面的这些功能
    let string = fs.readFileSync('./sign_up.html','utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }else if(path === '/sign_up' && method === 'POST'){
    response.setHeader('Content-Type', 'application/json;charset=utf-8')    
    readBody(request).then((body)=>{
      let strings = body.split('&')  //['email=1','password=2','password_confirmation=3']
      let hash = {}
      strings.forEach((string)=>{
        let parts = string.split('=')  ///['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)   //hash['emali']='1'
        // 这里需要进行转换一下格式才行，因为下面在输入email的时候会出现@符号，
        // 而这个符号是没有办法进行真确识别的。
      })
      console.log(hash)
      // 这个时候打印的内容会出现在后端的服务器上
      let {email, password, password_confirmation} = hash
      if(email.indexOf('@') === -1){ // 如果email中没有@，-1表示没有的意思，就会出现错误
        response.statusCode = 400
        // response.write('email is bad')  // 告诉前端的内容，换成下面这种写法
        response.write(`{
          "errors":{
            "email":"invalid"
          }
        }`)
      }else if(password !== password_confirmation){
        response.statusCode = 400
        response.write('password not match')
      }else{
        // 如输入的格式、内容都没有问题，那么就读取users这个数据文件
        var users = fs.readFileSync('./db/users','utf8')
        try{
          users = JSON.parse(users) 
        }catch(exception){//如果有异常就执行下面这一句
          users = []
        }
        //这里的意思就是使用JSON语法读取db中的数据文件，如果能真确进行读取则进行正确读取
        //如果不能进行真正确的读取，那么就将这个数据文件变为一个空的数组，JSON只能识别数组，不能识别对象{}
        let inUse = false 
        //主要用于判断用户注册的email是否已经被注册过了
        for(let i=0;i<users.length;i++){
          let user = users[i]
          if(user.email === email){
            inUse = true
            break;
          }
        }
        if(inUse){
          response.statusCode = 400
          response.write('email in use')
        }else{
          users.push({email:email,password:password})
          //这个时候将注册成功的用户和密码push到users这个变量中去，这时的users是一个对象，是不能存储的
          var usersString = JSON.stringify(users)
          //将users中的数组变为JSON的字符串的形式，方便进行存储
          fs.writeFileSync('./db/users',usersString)
          //将usersString进行存储到数据文件中
          response.statusCode = 200
        }
      }
      response.end()
    })
  }else if(path === '/sign_in' && method === 'GET'){
    let string = fs.readFileSync('./sign_in.html','utf8')
    response.statusCode = 200
    response.setHeader('Content-Type','text/html;chatset=utf8')
    response.write(string)
    response.end()
  }else if(path === '/sign_in' && method === 'POST'){
    readBody(request).then((body)=>{
      let strings = body.split('&')  //['email=1','password=2']
      let hash = {}
      strings.forEach((string)=>{
        let parts = string.split('=')  ///['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)   //hash['emali']='1'
        // 这里需要进行转换一下格式才行，因为下面在输入email的时候会出现@符号，
        // 而这个符号是没有办法进行真确识别的。
      })
      let {email, password} = hash
      var users = fs.readFileSync('./db/users','utf8')
        try{
          users = JSON.parse(users) 
        }catch(exception){//如果有异常就执行下面这一句
          users = []
        }
        let found
        for(i=0; i<users.length; i++){
          if(users[i].email === email && users[i].password === password){
            found = true
            break;
          }
        }
        if(found){
          let sessionId = Math.random()*100000
          sessions[sessionId] = {sign_in_email: email}
          //如果注册成功就用一个随机数组来代替这个邮箱，将这个随机数组与这个邮箱进行关联之后，
          //返回一个cookie时，显示的内容就是代表用户邮箱的随机数组
          response.setHeader('Set-Cookie',`sessionId=${sessionId}`)
          // 设置一个Cookie的标记，这Cookie标记是在登陆成功的时候出现的，此处设置的是登陆的email
          // 加上HttpOnly之后浏览器就不能通过JS去改动，可以手动改动
          response.statusCode = 200
        }else{
          response.statusCode = 401
        }
        response.end()
    })
  }else if(path === '/main.js'){
    let string = fs.readFileSync('./main.js','utf8')
    response.statusCode = 200
    response.setHeader('Content-Type','text/javascript;chatset=utf8')
    response.write(string)
    response.end()
  }else if(path === '/xxx'){
    response.statusCode = 200
    response.setHeader('Content-Type','text/json;charset=utf-8')
    response.setHeader('Access-Control-Allow-Origin','http://frank.com:8001')
    // 作为http://jack.com:8002的后端，加上上面这一句就能实现让http://frank.com:8001访问了
    response.write(`
      {
        "node":{
          "to":"小谷",
          "from":"方方",
          "head":"打招呼",
          "content":"hi"
        }
      }
    `)
    response.end()
  }else{
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(`
      "Error":"Not Fund"
    `)
    response.end()
  }

  /******** 代码结束，下面不要看 ************/
})
function readBody(request){
  // 这段函数的主要实现的功能就是将前端需要传到后端的数据或者字符串通过下面的这种方式进行传输
  return new Promise((resolve, reject)=>{
    let body = []
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      resolve(body)
    })
  })
}
server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)


