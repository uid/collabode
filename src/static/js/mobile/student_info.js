function initStudentPage() {
  w = $(window).width()/35;
  h = w*1.3;
  $('#homeIcon').css('width', w)
    .css('height', h)
    .css('margin', 0)
    .click( function(){
      window.location.href = 'index.php';
    })
  $('.card').css('width', w)
    .css('height', h)
    .css('margin', 0)
    /*.each( function() {
        if ($(this).attr('id') == 'card-9') {
      // What was I going to do here? o.O Maybe do something different if
      // the current card is selected
        }
    })*/
    .find('.nametag').hide();

  //initCards();
  // assign ids to each card
  i = 0;
  $('.card').each( function() {
    assignCardId($(this), i);
    $(this).addClass('thumb');
    i++;
  })
  // handle clicks
  .click( function() {
    // open up an individual page
    /*$("#studentPageContent")
    .load("student.php?id=" + encodeURIComponent($(this).attr('id')));*/
    window.location.href = 'student.php?id=' + 
    encodeURIComponent($(this).attr('username'));
  });
}