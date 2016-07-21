/*
 * Licensed Materials - Property of IBM
 * Copyright IBM Corp. 2014.  All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 */

// On selection event, take the first of the selected items
// and invoke the TrivialWebService on it
function handleSelection(ref) {
  if(!ref || ref.length == 0){
	return;
  }
	  
  var params = {};  
  params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT;
  
  // This parameter indicates that RM proxy should pass on the SSO token
    params[gadgets.io.RequestParameters.AUTHORIZATION]="SSO";
    params[gadgets.io.RequestParameters.HEADERS] = {"OSLC-Core-Version":"2.0",
                                                    "Accept": "application/rdf+xml"
                                                   }
  
  var url = ref[0].uri;

  // SERVICE_URL is defined in the gadget.xml file in a separate script tag
  var service = url;
  gadgets.io.makeRequest(service, responseHandler, params);
  setStatus("Request has been sent to remote service", "running");


// How to make an ArtifactRef from an existing one.  This is sample code that provides a workaround to
// cases where the URI of the artefact is known, but where the API does not provide a means to
// discover the ArtifactRef of that artefact.  (The example at had is an artefact which embeds other
// artefacts; we can extract the URI from the xhtml, but there is no means to get the ArtifactRef of these
// resources.

    RM.Data.getAttributes(ref, [RM.Data.Attributes.PRIMARY_TEXT] , function (result) {
        if(result.code !== RM.OperationResult.OPERATION_OK)
        {
            console.log("something went wrong");
        } else {
            result.data.forEach(function(attrs) {
                var parser = new DOMParser();
                // todo - parser doesn't like bnsp
                var pt = "<div>"+attrs.values[RM.Data.Attributes.PRIMARY_TEXT].replace(new RegExp("&nbsp;", "g")," ")+"</div>";
                var pt_node = parser.parseFromString(pt, "application/xml");
                var embedded_anchors_list = pt_node.getElementsByClassName("embedded");
                var embedded_anchors = [].slice.call(embedded_anchors_list, 0);
                embedded_anchors.forEach(function(anchor) {

                    // This construction is not supported  -  only for pilot/demo purposes!
                    var embedded_ref = new RM.ArtifactRef(anchor.getAttribute('href'), ref.componentUri, undefined, ref.format);
                    // Caveats:  (i) the artefact format of the embedded artefact is assumed to be the same as ref.  If this condition
                    // is violated, the API will probably break. This means that only textual embedded artefacts can be access using
                    // this workaround.

                    // (ii) the embedded artefact must be in the same project area as that of ref.  Same warnings as above.
                    // end of disclaimer

                    console.log("fetching attributes for the embedded_ref: " + embedded_ref);
                    RM.Data.getAttributes(embedded_ref, [RM.Data.Attributes.PRIMARY_TEXT] , function (result) {
                        if(result.code !== RM.OperationResult.OPERATION_OK)
                        {
                            console.log("something went wrong");
                        } else {
                            result.data.forEach(function(attrs) {
                                console.log("primary text of embedded artefact: ", attrs.values[RM.Data.Attributes.PRIMARY_TEXT]);
                            });
                        }
                    });
                });
                console.log(pt);
            });
        }
    });
};

/*
 * Handler for the result returned from the TrivialWebService
 * 
 * The response varies in form depending on whether there is a success or failure
 *  For Success the response is rdf/xml which needs escaping so it can be displayed
 *  For Failure the response is an html fragment that can be displayed directly
 */
function responseHandler(resp) {  
	var html =  resp.text;
	var status = "failed";

	// 200==Good Result, so escape rdf xml
	if (resp.rc==200)
	{
	   html = html.replace(/&/g,"&amp;");
	   html = html.replace(/</g,"&lt;");
	   html = html.replace(/>/g,"&gt;");
	   status="success";
	}
	else
	{
	   status="failed";
	}

    setStatus("Request completed. Result is :<br/>"+html, status);
};

// Update the status in the UI
// Status should be one of "running", "success", "failed"
function setStatus(msg, status){
	var domNode = document.getElementById('result');
	domNode.className="serviceResult "+status;
	domNode.innerHTML = msg;
}
	
// Subscribe to the selection event
RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, handleSelection);
