// purpose: to run progData through template to create display of program and set up event handlers for editing and dragging

// editor.js = path to progData setup (see prog creator docs)

// Global configuration object.
var progData = null;

// custom helper for _____
Handlebars.registerHelper('empty', function(data, options) {
 //  console.dir(data);
 if (data && data.length >= 0) {
   return new Handlebars.SafeString('<div class="session-talks">' + options.fn(this) + '</div>');
 }
});

// adds dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll("div.category"));
  var sessions = Array.prototype.slice.call(document.querySelectorAll(".session-talks"));
  var containers = talks.concat(sessions);

  // console.log('calling addDrag');
  // console.dir(progData);
  // console.log('number of containers = ' + containers.length);

  dragula(containers).on('drop',
    function(el, target, source, sibling) {
      console.log('drop event');

      if (target.classList.contains('session-talks')) {
        console.log('added to a session');

  	    // hide the drag & drop hint.
        target.firstChild.data = '';
        target.style.background = '#0000ff';
        target.style.border = '';
        console.dir(target);
      }

      if (source.classList.contains('session-talks')) {
        console.log('removed from a session');
        // console.dir(source);
        // Restore the drag & drop hint.
        if (source.childNodes.length == 1) {
          source.firstChild.data = 'Drag talks here';
          target.style.background = '#ff0000';
        }
      }
    });
  }

// draws template (assume progData has already been set)
function drawProgram() {
  var theTemplateScript = $("#program-template").html();
  var theTemplate = Handlebars.compile(theTemplateScript);
  var theCompiledHtml = theTemplate(progData);
  var renderedProgram = document.getElementById('renderedProgram');
  renderedProgram.innerHTML = theCompiledHtml;
  addDrag();
}

// parses JSON file
function getConfig(name) {
  $.getJSON('./json/' + name, function(data) {
    var days = data['days'];
    for (var i = 0; i < days.length; i++) {
      var timeslots = days[i]['timeslots'];
      for (var j = 0; j < timeslots.length; j++) {
        if(timeslots[j]['sessions'].length > 1) {
          timeslots[j]['twosessions'] = true;
        }
      }
    }
    progData = data;

/*
    var talks = data['config']['unassigned_talks'];
    var categories = {};
    if (talks) {
      for (var i = 0; i < talks.length; i++) {
        if ('undefined' == typeof talks[i].category) {
          category = 'Uncategorized';
        } else {
          category = talks[i].category;
        }
        if (!(category in categories)) {
          categories[category] = [];
        }
        categories[category].push(talks[i]);
      }
    }
    console.dir(categories);
    */
    drawProgram();
  })
  .fail(function(jqxhr, textStatus, error) {
    document.getElementById('renderedProgram');
    renderedProgram.innerHTML = '<p>The conference program is not currently available. Please check back later.</p>';

    if (textStatus === 'error') {
      console.log('program.json not found, check file name and try again');
    }
    else {
      console.log('There is a problem with program.json. The problem is ' + error);
    }
  });
}

// executes functions once document is ready
$(document).ready(function() {
   getConfig('crypto_config.json');
 });
