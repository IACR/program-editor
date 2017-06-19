// purpose: to run progData through template to create display of program and set up event handlers for editing and dragging

// editor.js = path to progData setup (see prog creator docs)

// Global configuration object.
var progData = null;

// TODO: add notification for when browser is too small using media breakpoint

// custom helper for _____
Handlebars.registerHelper('empty', function(data, options) {
 //  console.dir(data);
 if (data && data.length >= 0) {
   return new Handlebars.SafeString('<div class="session-talks">' + options.fn(this) + '</div>');
 }
});

// creating a new program
function createNew() {
  // TODO: code to reveal div with template selection
}

// jQuery-UI for date picker
//TODO: should name this function, yes?
$(function() {
  var dateFormat = "mm/dd/yy",
    from = $( "#from" ).datepicker({
      showButtonPanel: true,
      changeMonth: true,
      changeYear: true,
      numberOfMonths: 2
    })
    .on( "change", function() {
      to.datepicker( "option", "minDate", getDate( this ) );
    }),

    to = $( "#to" ).datepicker({
      showButtonPanel: true,
      changeMonth: true,
      changeYear: true,
      numberOfMonths: 2
    })
    .on( "change", function() {
      from.datepicker( "option", "maxDate", getDate( this ) );
    });

  function getDate( element ) {
    var date;
    try {
      date = $.datepicker.parseDate( dateFormat, element.value );
    } catch( error ) {
      date = null;
    }
    return date;
  }
});

// set dates in progData
function setDates(startdate, enddate) {
  // validate dates, modify progData, and show upload
}

// adds dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll("section.category"));
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
        target.style.border = '';
        console.dir(target);
      }

      if (source.classList.contains('session-talks')) {
        console.log('removed from a session');
        // console.dir(source);
        // Restore the drag & drop hint.
        if (source.childNodes.length == 1) {
          source.firstChild.data = 'Drag talks here';
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
    $('#datePicker').show(500);
    // drawProgram();
  })
  .fail(function(jqxhr, textStatus, error) {
    document.getElementById('renderedProgram');
    renderedProgram.innerHTML = '<p>The conference program is not currently available. Please check back later.</p>';

    if (textStatus === 'error') {
      console.log(name + ' not found, check file name and try again');
    }
    else {
      console.log('There is a problem with ' + name +  '. The problem is ' + error);
    }
  });
}

// executes functions once document is ready
$(document).ready(function() {
  //  getConfig('crypto_config.json');

  document.getElementById('parent').style.display = 'none';
 });
