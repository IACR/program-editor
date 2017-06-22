// TODO: add notification for when browser is too small using media breakpoint




// create progData, used to store info relevant parsed JSON files for use by the Handlebars template to create program
var progData = null;

// creating a new program template from available templates
function createNew() {
  $('#templateSelector').show(500);
}

// jQuery date picker
function createDatePicker(numDays) {
  $('#datePicker').dateRangePicker( {
    separator : ' to ',
    autoClose: true,
    minDays: numDays,
    maxDays: numDays,
    getValue: function() {
      if ($('#startdate').val() && $('#enddate').val() )
      return $('#startdate').val() + ' to ' + $('#enddate').val();
      else
      return '';
    },
    setValue: function(s,s1,s2) {
      $('#startdate').val(s1);
      $('#enddate').val(s2);
      setDates(s1);
    }
  });
}

// parses JSON file to create initial program structure
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
    console.dir(progData);
    createDatePicker(progData.days.length);
    $('#datePicker').show(500);
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

// set dates in progData
function setDates(startdate) {
  var day = moment(startdate);
  for (var i = 0; i < progData.days.length; i++) {
    progData.days[i].date = day.format('YYYY-MM-DD');
    day.add(1, 'days');
  }
  $('#uploadTalks').show(500);
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

// file upload
function uploadTalks(evt) {
  console.dir(evt);

  var files = evt.target.files;

  if (files == null || files.length == 0) {
    alert('You must select a file.');
    evt.target.value = '';
    return;
  }

  var file = evt.target.files[0];
  var reader = new FileReader();

  reader.onload = function(e) {
    var textFile = e.target;
    if (textFile == null || textFile.result == null) {
      alert('Unable to read file.');
      evt.target.value = '';
      return;
    } try {
      var data = JSON.parse(textFile.result);
      var acceptedPapers = validatePapers(data);
      console.dir(acceptedPapers);
      progData.config.unassigned_talks = acceptedPapers;

      if (acceptedPapers == null) {
        evt.target.value = '';
        return;
      }

      drawProgram();
      $('#setupPrompts').hide();
      $('#parent').show(500);
    } catch (ee) {
      console.dir(ee);
      alert('Unable to parse file as JSON.');
      evt.target.value = '';
      return;
    }
  }
  reader.readAsText(file, 'UTF-8');
}

// paper validation
function validatePapers(data) {
  if (!data.hasOwnProperty('acceptedPapers') || !Array.isArray(data.acceptedPapers)) {
    alert('JSON file is not websubrev format');
    return null;
  }

  var acceptedPapers = data.acceptedPapers;
  var re = /\s+and\s+/;

  for (var i = 0; i < acceptedPapers.length; i++) {
    var paper = acceptedPapers[i];

    if (!paper.hasOwnProperty('title') || !paper.hasOwnProperty('authors')) {
      alert('JSON file has a paper with a missing title or authors');
      return null;
    }

    if (!paper.hasOwnProperty('category')) {
      paper.category = 'Uncategorized';
    }

    var authorNames = paper.authors.split(re);
    var authors = [];

    for (j = 0; j < authorNames.length; j++) {
      authors.push({'name': authorNames[j]});
    }

    paper.authors = authors;
  }
  return data;
}

// custom helper for _____
Handlebars.registerHelper('empty', function(data, options) {
  if (data && data.length >= 0) {
    return new Handlebars.SafeString('<div class="session-talks">' + options.fn(this) + '</div>');
  }
});

// adds dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll("section.category"));
  var sessions = Array.prototype.slice.call(document.querySelectorAll(".session-talks"));
  var containers = talks.concat(sessions);

  dragula(containers).on('drop', function(el, target, source, sibling) {
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

      // Restore the drag & drop hint.
      if (source.childNodes.length == 1) {
        source.firstChild.data = 'Drag talks here';
      }
    }
  });
}

// executes functions once document is ready
$(document).ready(function() {
  // $('button#uploadTalksSelector').click(function() {
  //   $('input[type=file]').trigger('click', uploadTalks);
  // });
  document.getElementById('uploadTalksSelector').addEventListener('change', uploadTalks);
 });
