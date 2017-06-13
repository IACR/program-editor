// function divClicked() {
    // get elements with class name session-title
    // change them to <input> onclick
    // make them not all change at once
//     var divHtml = document.getElementsByClassName('session-title');
//     var editableText = $("<input type='text' class='form-control' placholder='Type in your new title here' />");
//     editableText.val(divHtml);
//     $(divHtml).replaceWith(editableText);
//     editableText.focus();
//     // setup the blur event for this new textarea
//     editableText.blur(editableTextBlurred);
// }
//
// function editableTextBlurred() {
//     var html = $(this).val();
//     var viewableText = $("<div>");
//     viewableText.html(html);
//     $(this).replaceWith(viewableText);
//     // setup the click event for this new div
//     viewableText.click(divClicked);
// }
//
// $(document).ready(function() {
//     $("h5").click(divClicked);
// });

$(document).ready(function() {
  //getjson for cryptoconfig
  // set progData to data
  // after that we'll make the other paths
  $(".session-title").click(function() {
    // id tells you what part in the data structure (progData, JS obj created from json fetched from server) needs to be updated
    var clickedElement = $(this).attr("id");
    $(this).replaceWith("<input type='text' class='form-control input-sm newInput' placeholder='Enter new session name here' />");
    $(".newInput").focus();

    //TODO: if another is clicked, this one loses focus - there can only be one at a time open
    console.log(clickedElement.val);
  });

  //TODO: take val of .newInput, replaceWith<h5>that value</h5
});
