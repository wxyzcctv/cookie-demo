var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if(!port){
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
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

  if(path === '/'){
    let string = fs.readFileSync('./index.html','utf8')
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
      let strings = body.split('&')  //['email=1','password=2','password_comfirmation=3']
      let hash = {}
      strings.forEach((string)=>{
        let parts = string.split('=')  ///['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = value   //hash['emali']='1'
      })
      console.log(hash)
      // 这个时候打印的内容会出现在后端的服务器上
      let {email, password, password_comfirmarion} = hash
      if(email.indexOf('@') === -1){ // 如果email中没有@，-1表示没有的意思，就会出现错误
        response.statusCode = 400
        // response.write('email is bad')  // 告诉前端的内容，换成下面这种写法
        response.write(`{
          "errors":{
            "email":"invalid"
          }
        }`)
      }else if(password !== password_comfirmarion){
        response.statusCode = 400
        response.write('password not match')
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


