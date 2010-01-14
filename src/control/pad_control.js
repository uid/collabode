import("collab.collab_server");
import("helpers");
import("utils.*");
import("pad.revisions");
import("pad.pad_users");
import("pad.pad_utils");

function _createIfNecessary(localPadId, pad) {
    if (pad.exists()) {
        // XXX delete getSession().instantCreate;
        return;
    }
    // XXX make sure localPadId is valid?
    //if (request.params.createImmediately || getSession().instantCreate == localPadId) {
    pad.create("This is an empty pad.\n");
    // XXX delete getSession().instantCreate;
    return;
    //}
    //response.redirect("/ep/pad/create?padId="+encodeURIComponent(localPadId));
}

function render_pad(localPadId) {
    var userId = pad_users.getUserId();
    
    var opts = { };
    var globalPadId;

    pad_utils.accessPadLocal(localPadId, function(pad) {
        globalPadId = pad.getId();
        request.cache.globalPadId = globalPadId;
        _createIfNecessary(localPadId, pad);

        helpers.addClientVars({
            padId: localPadId,
            globalPadId: globalPadId,
            userAgent: request.headers["User-Agent"],
            collab_client_vars: collab_server.getCollabClientVars(pad),
            initialRevisionList: revisions.getRevisionList(pad),
            serverTimestamp: +(new Date),
            initialOptions: pad.getPadOptionsObj(),
            userId: userId,
            opts: opts
        });

    });

    renderHtml("pad/pad_body.ejs", {
        localPadId: localPadId,
        bodyClass: "limwidth"
    });
    return true;
}
