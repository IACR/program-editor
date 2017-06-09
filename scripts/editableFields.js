function divClicked() {
    // get elements with class name session-title
    // change them to <input> onclick
    // make them not all change at once
    var divHtml = document.getElementsByClassName('session-title');
    var editableText = $("<input type='text' class='form-control' placholder='Type in your new title here' />");
    editableText.val(divHtml);
    $(divHtml).replaceWith(editableText);
    editableText.focus();
    // setup the blur event for this new textarea
    editableText.blur(editableTextBlurred);
}

function editableTextBlurred() {
    var html = $(this).val();
    var viewableText = $("<div>");
    viewableText.html(html);
    $(this).replaceWith(viewableText);
    // setup the click event for this new div
    viewableText.click(divClicked);
}

$(document).ready(function() {
    $("h5").click(divClicked);
});
