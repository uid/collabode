function ClassSummary() {
  this.id = "#class-summary-page";
  this.obj = $(this.id);
  
  
  this.updateTimer = null;
  this.show = function() {
    
    // TODO: ...
    
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