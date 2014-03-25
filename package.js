pipe.once('package::initialise', function (data, pagelet) {
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
    e.preventDefault();

    var parent = $(this).parents('.fourcol');

    //
    // Show the rows that were hidden and remove the table foot as we're already
    // showing all the fields now.
    //
    parent.find('.gone').fadeIn();
    $(this).remove();
  });
});
