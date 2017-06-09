var talks = Array.prototype.slice.call(document.querySelectorAll("div.category"));
var sessions = Array.prototype.slice.call(document.querySelectorAll("div.session-talks"));
var containers = talks.concat(sessions);

dragula(containers).on('drop', function(el, target, source, sibling) {
  if (target.classList.contains('session-talks')) {
    console.log('added to a session');
    console.dir(target);

    // hide the drag & drop hint.
    target.firstChild.data = '';
  }

  if (source.classList.contains('session-talks')) {
    console.log('removed from a session');

    // Restore the drag & drop hint.
    if (source.childNodes.length == 1) {
      source.firstChild.data = 'Drag talks here';
    }
  }
});

// onclick .sesstion-title, focus change to input box that autosaves on blur
function editSessionTitle() {
  var titleClick = document.getElementsByClassName("session-title");
  titleClick.onclick = console.log("you clicked a title");
}
