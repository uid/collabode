import("faststatic");
import("dispatch.{Dispatcher,PrefixMatcher}");

function onRequest() {
    var staticBase = '/static';
    
    var opts = { };
    
    var serveStaticDir = faststatic.directoryServer(staticBase, opts);
    var serveJs = faststatic.directoryServer(staticBase+'/js/', opts);
    var serveCss = faststatic.directoryServer(staticBase+'/css/', opts);
    
    var dispatcher = new Dispatcher();
    dispatcher.addLocations([
        [PrefixMatcher('/static/js/'), serveJs],
        [PrefixMatcher('/static/css/'), serveCss],
        [PrefixMatcher('/static/'), serveStaticDir]
    ]);
    
    return dispatcher.dispatch();
}
