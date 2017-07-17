// TODO: add notification for when browser is too small using media breakpoint


// create global variables: to store parsed JSON files for use in templates (progData), the template for the program (progTemplate), the template for the unassigned talks listed at left (talksTemplate), and for keeping track of the indeces of talks (lastTalkIndex)
var progData;
var progTemplate;
var talksTemplate;
var lastTalkIndex;

// create new program template from available templates
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
      if ($('#startdate').val() && $('#enddate').val()) {
        return $('#startdate').val() + ' to ' + $('#enddate').val();
      } else {
        return '';
      }
    },
    setValue: function(s,s1,s2) {
      $('#startdate').val(s1);
      $('#enddate').val(s2);
      setDates(s1);
    }
  });
}

// parse JSON file to create initial program structure
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

// set start/end dates in progData
function setDates(startdate) {
  var day = moment(startdate);
  for (var i = 0; i < progData.days.length; i++) {
    progData.days[i].date = day.format('YYYY-MM-DD');
    day.add(1, 'days');
  }
  $('#uploadTalks').show(500);
}

// draw talks template
function drawTalks() {
  var theCompiledHtml = talksTemplate(progData.config);
  var renderedTalks = document.getElementById('talksList');
  renderedTalks.innerHTML = theCompiledHtml;
}

// draw program template
function drawProgram() {
  var theCompiledHtml = progTemplate(progData);
  var renderedProgram = document.getElementById('renderedProgram');
  renderedProgram.innerHTML = theCompiledHtml;
}

// upload JSON file of talks and parse
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

// make authors an array of strings
function splitAuthors(val) {
  var re = /\s+and\s+|\s*;\s*/;
  return val.split(re);
}

// paper validation
function validatePapers(data) {
  if (!data.hasOwnProperty('acceptedPapers') || !Array.isArray(data.acceptedPapers)) {
    warningBox('JSON file is not websubrev format.');
    return null;
  }
  var acceptedPapers = data.acceptedPapers;
  lastTalkIndex = acceptedPapers.length;

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
    paper.authors = splitAuthors(paper.authors);
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

// style warnings and error message for better visibility to user
function warningBox(text) {
  $('#modal-message').text(text);
  $('#errorBox').modal();
}

// custom helper for generating droppable div (i.e. distinguishing between sessions that can accept talks and those that can't)
Handlebars.registerHelper('empty', function(data, options) {
  if (data && data.length >= 0) {
    return new Handlebars.SafeString('<div class="session-talks">' + options.fn(this) + '</div>');
  }
});

// add dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll(".category"));
  var sessions = Array.prototype.slice.call(document.querySelectorAll(".session-talks"));
  var containers = talks.concat(sessions);

  dragula(containers).on('drop', function(el, target, source, sibling) {
    if (target.classList.contains('session-talks')) {
      // hide drag & drop hint
      target.firstChild.data = '';
      target.style.border = '';

      // TODO: only an example of how to calculate length; will need to be changed for production
      if (target.childNodes.length == 5) {
        var start = moment("10:55", "HH:MM");
        var end = moment("11:35", "HH:MM");
        warningBox('diff is ' + end.diff(start));
        warningBox('Are you sure you want more than 3 talks in a session?');
      }
    }
    if (source.classList.contains('session-talks')) {
      // restore drag & drop hint
      if (source.childNodes.length == 1) {
        source.firstChild.data = 'Drag talks here';
      }
    }
    updateProgData(el, target, source, sibling);
  });
}

// Recurse through a javascript object looking for a node with a given id.
// This is used to update progData whenever a drop happens, because we have
// to find the relevant session and category to update when a talk is moved.
// In this function, currentNode could be either a string, a number,
// an array, or an object. It could only have an id inside it if it's
// an object, but if it's an array then we have to call findObj on
// each element in the array to look for the id.
function findObj(id, currentNode) {
  if (typeof currentNode === "string" || typeof currentNode === "number") {
    return false;
  }
  // console.dir(currentNode);
  var i, currentChild, result;
  if (Array.isArray(currentNode)) {
    for (i = 0; i < currentNode.length; i++) {
      currentChild = currentNode[i];
      result = findObj(id, currentChild);
      if (result != false) {
        return result;
      }
    }
    return false;
  }
  // At this point we know that currentNode is an object, so we check
  // for the id.
  if (currentNode.hasOwnProperty('id') && currentNode.id == id) {
    return currentNode;
  }
  // At this point we have to check all the subobjects. First build a list
  // of the properties.
  var properties = [];
  for (var property in currentNode) {
    if (currentNode.hasOwnProperty(property)) {
      properties.push(property);
    }
  }
  // Now check each child node.
  for (i = 0; i < properties.length; i++) {
    currentChild = currentNode[properties[i]];
    result = findObj(id, currentChild);
    if (result != false) {
      return result;
    }
  }
  // We didn't find it anywhere, and there were no children to check.
  return false;
}

// When a talk in el is dragged from source to target and placed next
// to sibling, we have to update progData to reflect the move. Updating
// progdata requires knowing the ids of everything, finding the correct
// arrays, and updating them.
// el is the talk, so el.id is the id of the talk.
// target is where the talk was dropped,
// source is where it was dragged from.
// sibling is what it is placed in front of.
function updateProgData(el, target, source, sibling) {
  // first find the ids of the talk, source, and destination.  It's
  // possible to move things between categories and sessions, so we
  // have to handle all those cases. The algorithm is to find all the
  // relevant ids of the target, source, and talk, then use findObj
  // to find the appropriate node in progdata, and update the relevant
  // arrays.
  console.dir(sibling);
  var talkObj = findObj(el.id, progData);
  if (talkObj === false) {
    console.log('unable to find talk in progData');
    return false;
  }
  // sourceArray and targetArray point to a talks array, either in a
  // category or a session.
  console.log('source id is ' + source.parentNode.id);
  var sourceObj = findObj(source.parentNode.id, progData);
  if (sourceObj === false) {
    console.log('unable to update source');
    return false;
  }
  var sourceTalks = sourceObj.talks;
  var targetObj = findObj(target.parentNode.id, progData);
  if (targetObj === false) {
    console.log('unable to update target');
    return false;
  }

  // remove from sourceTalks and add to targetTalks
  var sourceIndex = sourceTalks.findIndex(function(t) {
    if (t.id == el.id) {
      return true;
    }
    return false;
  });
  if (sourceIndex < 0) {
    console.log('unable to find talk in source talks.');
    return false;
  }
  console.log('removing talk at index ' + sourceIndex);
  sourceTalks.splice(sourceIndex, 1);

  var targetTalks = targetObj.talks;

  // if sibling is null then put at end of targetTalks
  // if sibling is not null, insert before that
  if (sibling === null) {
    targetTalks.push(talkObj);
  } else {
    var siblingIndex = targetTalks.findIndex(function(t) {
      if (t.id == sibling.id) {
        return true;
      }
      return false;
    });
    if (siblingIndex < 0) {
      console.log('sibling not found');
      targetTalks.push(talkObj);
    } else {
      targetTalks.splice(siblingIndex, 0, talkObj);
      console.log('inserting at position ' + siblingIndex);
    }
  }
  return true;
}

// save new talk after talk data has already been used to generate template
function addNewTalk() {
  var talk = {};
  talk.id = "talk-" + lastTalkIndex;
  lastTalkIndex++;
  talk.title = $('#newTalkTitle').val();
  talk.authors = splitAuthors($('#newTalkAuthor').val());
  // TODO: handle affiliations
  // talk.affiliation = $('#newTalkAffiliation').val();

  var category = $('#newTalkCategory').children(':selected');
  talk.category = category.text();
  var categoryIndex = new Number(category.attr('value'));
  progData.config.unassigned_talks[categoryIndex].talks.push(talk);
  drawTalks();
  addDrag();
}

// populate categories from current config in add talk modal
function addCategories() {
  // remove all categories in case loop has already been triggered, so you don't get duplicate categories
  $('#newTalkCategory').find('option').remove().end()

  for (var i = 0; i < progData.config.unassigned_talks.length; i++) {
    $('#newTalkCategory').append($('<option>', {
      value:i, text:progData.config.unassigned_talks[i].name
    }));
  }
}

// prepopulate edit session modal with relevant fields from parent div of clicked edit button
function editSession(sessionId) {
  var sessionObj = findObj(sessionId, progData);
  $('#currentSessionId').val(sessionId);
  $('#currentSessionTitle').val(sessionObj.session_title);

  if (sessionObj.moderator) {
    $('#currentSessionModerator').val(sessionObj.moderator);
  }

  // BUG/TODO: if session does not have location, inherits from last edited/poss. nearest sibling. not sure why.
  if (sessionObj.location.name) {
    $('#currentSessionLocation').val(sessionObj.location.name);
  }
}

// submit button for edit session
function saveSession() {
  var sessionId = $('#currentSessionId').val();
  var sessionObj = findObj(sessionId, progData);
  sessionObj.session_title = $('#currentSessionTitle').val();

  // TODO: need some sort of check that required fields are in fact filled out. if not, insert helper text or change title to red or something
  // below if statement is currently NONFUNCTIONAL
  if ($('#currentSessionTitle').val() === "") {
    alert('gimme a title!');
    // event.preventDefault();
    // $('#currentSessionTitle').addClass('has-error');
  }

  sessionObj.location.name = $('#currentSessionLocation').val();
  sessionObj.moderator = $('#currentSessionModerator').val();
  // TODO: after drag/drop and edit session, 'drag talks' placeholder reappears

  drawProgram();
  drawTalks();
  addDrag();
}

// download edited JSON program
function downloadJSON() {
  var atag = document.createElement('a');
  atag.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(progData, null, 2)));
  atag.setAttribute('download', 'program.json');

  if (document.createEvent) {
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    atag.dispatchEvent(event);
  } else {
    atag.click();
  }
}

// NOTE: DEBUG ONLY, remove in production. bypasses other steps so all you have to do is upload talks
function debugStart() {
  createNew();
  getConfig('crypto_config.json');
  $('#uploadTalks').show(500);
}

// executes functions once document is ready
$(document).ready(function() {
  document.getElementById('uploadTalksSelector').addEventListener('change', uploadTalks);

  // NOTE: for debug purposes only, remove in production
  debugStart();

  // compile templates to html
  var theTemplateScript = $("#program-template").html();
  progTemplate = Handlebars.compile(theTemplateScript);
  theTemplateScript = $("#talks-template").html();
  talksTemplate = Handlebars.compile(theTemplateScript);
 });
