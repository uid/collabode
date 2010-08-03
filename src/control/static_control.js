import("faststatic.{singleFileServer,directoryServer}");
import("dispatch.{Dispatcher,PrefixMatcher}");

function onRequest() {
    var staticBase = '/static';
    
    var opts = { };
    
    var serveFavicon = singleFileServer(staticBase+'/img/favicon.ico', opts);
    var serveStaticDir = directoryServer(staticBase, opts);
    var serveJs = directoryServer(staticBase+'/js/', opts);
    var serveCss = directoryServer(staticBase+'/css/', opts);
    
    var dispatcher = new Dispatcher();
    dispatcher.addLocations([
        ['/favicon.ico', serveFavicon],
        ['/robots.txt', serveRobotsTxt],
        [PrefixMatcher('/static/js/'), serveJs],
        [PrefixMatcher('/static/css/'), serveCss],
        [PrefixMatcher('/static/'), serveStaticDir]
    ]);
    
    return dispatcher.dispatch();
}

function serveRobotsTxt() {
  response.neverCache();
  response.setContentType('text/plain');
  response.write('User-agent: *\n');
  response.write('Disallow: /\n');
  response.stop();
  return true;
}
