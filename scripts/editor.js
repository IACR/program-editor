// TODO: add notification for when browser is too small using media breakpoint


// create progData, used to store info relevant parsed JSON files for use by the Handlebars template to create program and list of talks
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
    var idCounter = 0;
    var days = data['days'];

    for (var i = 0; i < days.length; i++) {
      var timeslots = days[i]['timeslots'];
      for (var j = 0; j < timeslots.length; j++) {
        for (var k = 0; k < timeslots[j]['sessions'].length; k++) {
          timeslots[j]['sessions'][k].id = 'session-' + idCounter;
          idCounter++;
        }

        if(timeslots[j]['sessions'].length > 1) {
          timeslots[j]['twosessions'] = true;
        }
      }
    }
    progData = data;
    createDatePicker(progData.days.length);
    $('#datePicker').show(500);
  })
  .fail(function(jqxhr, textStatus, error) {
    warningBox('There was a problem with this conference template. Please try another.');
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

// draws talks template
function drawTalks() {
  var theTemplateScript = $("#talks-template").html();
  var theTemplate = Handlebars.compile(theTemplateScript);
  var theCompiledHtml = theTemplate(progData.config);
  var renderedTalks = document.getElementById('talksList');
  renderedTalks.innerHTML = theCompiledHtml;
}

// draws program template
function drawProgram() {
  var theTemplateScript = $("#program-template").html();
  var theTemplate = Handlebars.compile(theTemplateScript);
  var theCompiledHtml = theTemplate(progData);
  var renderedProgram = document.getElementById('renderedProgram');
  renderedProgram.innerHTML = theCompiledHtml;
}

// file upload
function uploadTalks(evt) {
  var files = evt.target.files;

  if (files == null || files.length == 0) {
    warningBox('You must select a file.');
    evt.target.value = '';
    return;
  }

  var file = evt.target.files[0];
  var reader = new FileReader();

  reader.onload = function(e) {
    var textFile = e.target;
    if (textFile == null || textFile.result == null) {
      warningBox('Unable to read file.');
      evt.target.value = '';
      return;
    } try {
      var data = JSON.parse(textFile.result);
      var acceptedPapers = validatePapers(data);
      progData.config.unassigned_talks = acceptedPapers;

      if (acceptedPapers == null) {
        evt.target.value = '';
        return;
      }

      drawProgram();
      drawTalks();
      addDrag();
      $('#setupPrompts').hide();
      $('#parent').show(500);
    } catch (ee) {
      warningBox('Unable to parse file as JSON.');
      evt.target.value = '';
      return;
    }
  }
  reader.readAsText(file, 'UTF-8');
}

// paper validation
function validatePapers(data) {
  if (!data.hasOwnProperty('acceptedPapers') || !Array.isArray(data.acceptedPapers)) {
    warningBox('JSON file is not websubrev format.');
    return null;
  }
  var acceptedPapers = data.acceptedPapers;
  var re = /\s+and\s+|\s*;\s*/;

  for (var i = 0; i < acceptedPapers.length; i++) {
    var paper = acceptedPapers[i];

    if (!paper.hasOwnProperty('title') || !paper.hasOwnProperty('authors')) {
      warningBox('JSON file has a paper with a missing title or authors');
      return null;
    }

    if (!paper.hasOwnProperty('category')) {
      paper.category = 'Uncategorized';
    }
    paper.id = "talk-" + i;
    var authorNames = paper.authors.split(re);
    var authors = [];

    for (j = 0; j < authorNames.length; j++) {
      authors.push({'name': authorNames[j]});
    }
    paper.authors = authors;
  }

  // create map from category name to array of talks for that category
  var categoryMap = {};
  for (var i = 0; i < acceptedPapers.length; i++) {
    var paper = acceptedPapers[i];

    if (paper.category in categoryMap) {
      categoryMap[paper.category].push(paper);
    } else {
      categoryMap[paper.category] = [paper];
    }
  }
  var categoryList = [];
  for (var name in categoryMap) {
    if (categoryMap.hasOwnProperty(name)) {
      categoryList.push({'name': name, 'talks': categoryMap[name], 'id': 'category-' + categoryList.length});
    }
  }
  categoryList.sort(function(c1, c2) {
    if (c1.name < c2.name) {
      return -1;
    }
    if (c1.name > c2.name) {
      return 1;
    }
    return 0;
  });

  return data.acceptedPapers = categoryList;
  return data;
}

// styles warnings and error message appropriately/in a way that is immediately evident to the user
function warningBox(text) {
  $('#modal-message').text(text);
  $('#modalBox').modal();
}

// custom helper for generating droppable div (i.e. distinguishing between sessions that can accept talks and those that can't)
Handlebars.registerHelper('empty', function(data, options) {
  if (data && data.length >= 0) {
    return new Handlebars.SafeString('<div class="session-talks">' + options.fn(this) + '</div>');
  }
});

// adds dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll(".category"));
  var sessions = Array.prototype.slice.call(document.querySelectorAll(".session-talks"));
  var containers = talks.concat(sessions);

  dragula(containers).on('drop', function(el, target, source, sibling) {
    if (target.classList.contains('session-talks')) {
      // hide drag & drop hint
      target.firstChild.data = '';
      target.style.border = '';

      // TODO: only an example of how to calculate length; will need to be changed
      if (target.childNodes.length == 5) {
        var start = moment("10:55", "HH:MM");
        var end = moment("11:35", "HH:MM");
        warningBox('diff is ' + end.diff(start));
        warningBox('Are you sure you want more than 3 talks in a session?');
      }
    }
    if (source.classList.contains('session-talks')) {
      // Restore the drag & drop hint.
      if (source.childNodes.length == 1) {
        source.firstChild.data = 'Drag talks here';
      }
    }
  });
}

// DEBUG ONLY, remove in production
function debugStart() {
  createNew();
  getConfig('crypto_config.json');
  $('#uploadTalks').show(500);
  // all you have to do is upload talks
}

// executes functions once document is ready
$(document).ready(function() {
  document.getElementById('uploadTalksSelector').addEventListener('change', uploadTalks);

  // NOTE: for debug purposes only, remove in production
  debugStart();
 });
