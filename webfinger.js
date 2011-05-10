function gadgetRun() {
    var req = opensocial.newDataRequest();

    req.add(req.newFetchPersonRequest(opensocial.IdSpec.PersonId.OWNER), "owner");

    req.send(onOwnerReceived);
}

function onOwnerReceived(response) {
    var ownerResponse = response.get("owner");
    if(ownerResponse && !ownerResponse.hadError()) {
        var owner = ownerResponse.getData();

        var emails = owner.getField(opensocial.Person.Field.EMAILS);
        var email = emails[0].getField(opensocial.Email.Field.ADDRESS);
        //loadHostMeta(email);
        //return;
        for(var i = 0; i < emails.length; i++) {
            loadHostMeta(emails[i].getField(opensocial.Email.Field.ADDRESS));
        }
    }
}

function loadHostMeta(email) {
    var host = email.match(/\@(.*)/)[1];
    var url = 'http://' + host + '/.well-known/host-meta';
    var params = {}; 
    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT; 
    gadgets.io.makeRequest(url, function(response) { 
        gadgets.log(response.text);
        var lrdd = response.text.match(/<Link\s*rel='lrdd'\s*template='(.*?)'/i);
        if (lrdd) {
            loadLrdd(lrdd[1].replace('{uri}', email));
        }
    }, params);
}

function loadLrdd(url) {
    var params = {}; 
    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT; 
    gadgets.io.makeRequest(url, function(response) { 
        gadgets.log(response.text);
        var portableContactsUrl = response.text.match(/<Link\s*rel='http:\/\/portablecontacts.net\/spec\/1.0#me'\s*href='(.*?)'/i);
        if (portableContactsUrl) {
            loadPortableContacts(portableContactsUrl[1]);
        }
    }, params);
}

function loadPortableContacts(url) {
    url += '?fields=@all';
    var params = {}; 
    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON; 
    gadgets.io.makeRequest(url, function(response) { 
        renderProfile(response.data.entry);
    }, params);
}

var template = '\
<img src="{{thumbnailUrl}}" /> \
<div id="information"><b>{{displayName}}</b>\
<br />\
{{#organizations}}\
{{title}}<br />{{name}}<br />\
{{/organizations}}\
{{#urls}}\
<a href="{{value}}" target="_blank">{{linkText}}{{type}}</a><br />\
{{/urls}}\
</div><hr />\
';

function renderProfile(data) {
    
    gadgets.log(gadgets.json.stringify(data));
    if (data) {
        $('#loading').hide();
        $('#profile').append(Mustache.to_html(template, data));
        gadgets.window.adjustHeight();
    }
}

if (typeof gadgets !== 'undefined' && gadgets.util && gadgets.util.registerOnLoadHandler) {
    gadgets.util.registerOnLoadHandler(gadgetRun);
}
else {
    $(document).ready(function() {
        gadgetRun();
    });
}