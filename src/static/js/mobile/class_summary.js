function ClassSummary() {
  this.id = "#class-summary-page";
  this.obj = $(this.id);
  this.data = null;
  
  this.updateTimer = null;
  this.show = function() {
    requestClassSummary();
    return this;
  }
  
  this.display = function() {
    
    // TODO: ...
    this.obj.find("#runs-mean").text(this.data.meanRunCount);
    this.obj.find("#runs-min").text(this.data.minRunCount);
    this.obj.find("#runs-max").text(this.data.maxRunCount);
    
    // Poll continuously for updates
    this.updateTimer = setTimeout(this.show, 500);
    
    // Show
    this.obj.fadeIn(200);
    return this;
  }
  
  this.hide = function() {
    
    // Stop polling for updates
    clearTimeout(this.updateTimer);
    
    // Fade out the panel
    this.obj.fadeOut(200);
    
    // TODO: ... clear anything out?
    
    return this;
  }
  
  
  return this;
}

/*=======================
 * Functions to request other information
 */
function requestClassSummary() {
  var request = {};
  request.type = "REQUEST_CLASS_SUMMARY";
  collab.sendExtendedMessage(request);
  return false;
}
