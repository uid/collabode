$(document).ready(function() {
    var ace = new Ace2Editor();
    ace.init("editorcontainer", "", function() {
        $("#editorloadingbox").hide();
    });
    
    var user = {
        userId: clientVars.userId,
        name: clientVars.userName,
        // ip, colorId, userAgent
    };
    
    var collab = getCollabClient(ace,
                                 clientVars.collab_client_vars,
                                 user,
                                 { });
});