pipe.once('package:initialize', function (pagelet) {
  'use strict';

  //
  // We don't need to have any other information from the pagelet then the
  // placeholders/elements that contain our packages-pagelet placeholders.
  //
  pagelet = $(pagelet.placeholders);

  //
  // Show more rows when we click on the table footer.
  //
  pagelet.on('click', '.details .show-all', function click(e) {
    if (!~this.href.indexOf('#')) return; // We have a dependencies pagelet.

    e.preventDefault();

    var element = $(this)
      , text = element.text()
      , state = element.data('state')
      , parent = element.parents('.sixcol');

    //
    // Show the rows that were hidden and remove the table foot as we're already
    // showing all the fields now.
    //
    parent.find('.gone')[state ? 'fadeOut' : 'fadeIn']();
    element.text(element.data('text')).data('text', text).data('state', !state);
  });
});
