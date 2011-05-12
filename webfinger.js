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
        if (response.errors.length > 0) {
            renderNotFound(email);
            return;
        }
        gadgets.log(gadgets.json.stringify(response));
        var lrdd = response.text.match(/<Link\s*rel='lrdd'\s*template='(.*?)'/i);
        if (lrdd) {
            loadLrdd(lrdd[1].replace('{uri}', email), email);
        }
    }, params);
}

function loadLrdd(url, email) {
    var params = {}; 
    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT; 
    gadgets.io.makeRequest(url, function(response) { 
        if (response.errors.length > 0) {
            renderNotFound(email);
            return;
        }
        var portableContactsUrl = response.text.match(/<Link\s*rel='http:\/\/portablecontacts.net\/spec\/1.0#me'\s*href='(.*?)'/i);
        if (portableContactsUrl) {
            loadPortableContacts(portableContactsUrl[1], email);
        }
    }, params);
}

function loadPortableContacts(url, email) {
    url += '?fields=@all';
    var params = {}; 
    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON; 
    gadgets.io.makeRequest(url, function(response) { 
        if (response.errors.length > 0) {
            renderNotFound(email);
            return;
        }
        renderProfile(response.data.entry, email);
    }, params);
}

var template = '\
<h3>{{original_email}}</h3>\
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

function renderProfile(data, email) {
    
    gadgets.log(gadgets.json.stringify(data));
    if (data) {
        $('#loading').hide();
        data.original_email = email;
        $('#profile').prepend(Mustache.to_html(template, data));
        gadgets.window.adjustHeight();
    }
}

var notFoundTemplate = '<b>{{original_email}}</b><br />No information found <hr />';
function renderNotFound(email) {
    $('#loading').hide();
    $('#profile').prepend(Mustache.to_html(notFoundTemplate, {original_email: email}));
    gadgets.window.adjustHeight();
}

if (typeof gadgets !== 'undefined' && gadgets.util && gadgets.util.registerOnLoadHandler) {
    gadgets.util.registerOnLoadHandler(gadgetRun);
}
else {
    $(document).ready(function() {
        gadgetRun();
    });
}