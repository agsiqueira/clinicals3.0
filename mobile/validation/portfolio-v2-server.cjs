const fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(__dirname,'..'),bundle=path.resolve(root,'../docs/design/portfolio-v2/app.js');
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');let file;
  if(u.pathname==='/app.js')file=bundle;
  else if(u.pathname.startsWith('/clinicals3.0-approved-ui/mobile/node_modules/'))file=path.resolve(root,'node_modules',decodeURIComponent(u.pathname.slice('/clinicals3.0-approved-ui/mobile/node_modules/'.length)));
  else if(u.pathname.startsWith('/assets/')){
    const asset=decodeURIComponent(u.pathname.slice(8));
    // Metro junctions emit fonts relative to the installed dependency checkout.
    const dependencyPrefix='../../clinicals3.0-approved-ui/mobile/node_modules/';
    file=asset.startsWith(dependencyPrefix)?path.resolve(root,'node_modules',asset.slice(dependencyPrefix.length)):path.resolve(root,asset);
  }
  else {res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{height:100%;width:100%;margin:0;overflow:hidden}#root{display:flex}*{box-sizing:border-box}</style><div id="root"></div><script src="/app.js"></script></html>');return;}
  if(!(file===bundle||file.startsWith(root+path.sep))||!fs.existsSync(file)){res.statusCode=404;res.end();return;}
  const ext=path.extname(file);res.setHeader('Content-Type',ext==='.js'?'application/javascript;charset=utf-8':ext==='.svg'?'image/svg+xml':ext==='.png'?'image/png':ext==='.ttf'?'font/ttf':'application/octet-stream');fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.ROADMAP_REVIEW_PORT || 4185),'127.0.0.1',()=>console.log('Synthetic Roadmap review ready'));
