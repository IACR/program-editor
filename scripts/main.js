/*
- html file > editor.js > functions for event handling
- editor.js = path to progData setup (see prog creator docs)
  - for now stick to one .js file (editor.js)

- run progData through template to create display of program and setup event handlers for editing and dragging
*/

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
