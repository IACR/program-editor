// TODO: add notification for when browser is too small using media breakpoint

// Create global variables: to store parsed JSON files for use in templates (progData), the template for the program (progTemplate), and the template for the unassigned talks listed at left (talksTemplate)
var progData;
var progTemplate;
var talksTemplate;

// This is called when the app is opened, and disables menu items that only make
// sense if a program is being edited.
function disableMenus() {
  $('#saveMenu').addClass('disabled');
  $('#saveAsMenu').addClass('disabled');
  $('#downloadMenu').addClass('disabled');
  $('#uploadTalksMenu').addClass('disabled');
  $('#importDOIMenu').addClass('disabled');
}

// This is called when a program is loaded to edit.
function enableMenus() {
  $('#save_status').text(progData.name);
  $('#saveMenu').removeClass('disabled');
  $('#saveAsMenu').removeClass('disabled');
  $('#downloadMenu').removeClass('disabled');
  $('#uploadTalksMenu').removeClass('disabled');
  $('#importDOIMenu').removeClass('disabled');
}
// Returns new integer for use as id on talks and sessions
function createUniqueId() {
  progData.config.uniqueIDIndex++;
  return progData.config.uniqueIDIndex;
}

// Validates that data conforms to progData schema
// TODO: use JSON schema validate, (e.g. ajv)
function setProgData(data) {
  if (!data.config.uniqueIDIndex) {
    data.config.uniqueIDIndex = 0;
  }
  progData = data;
  var days = progData.days;

  for (var i = 0; i < days.length; i++) {
    var timeslots = days[i]['timeslots'];
    for (var j = 0; j < timeslots.length; j++) {
      if (timeslots[j].sessions) {
        for (var k = 0; k < timeslots[j]['sessions'].length; k++) {
          timeslots[j]['sessions'][k].id = 'session-' + createUniqueId();
        }
        if(timeslots[j]['sessions'].length > 1) {
          timeslots[j]['twosessions'] = true;
        }
      }
    }
  }
  return data;
}

// TODO: move to more appropriate spot
// Show a list of all existing versions to edit.
function editExisting() {
  $('#templateSelector').hide();
  $('#nameEntry').hide();
  $('#datePicker').hide();
  $('#uploadTalks').hide();
  $('#versionPicker').show(500);
  $.getJSON('ajax.php', function(data) {
    // remove the rows other than the first.
    $('#versionList').find("tr:gt(0)").remove();
    $('#versionList').show();
    for (var i = 0; i < data.programs.length; i++) {
      var row = data.programs[i];
      $('#versionList').append('<tr><td><a class="progName" href=javascript:getConfig("ajax.php?id=' + row.id + '",true);>' + row.name + '</a></td><td>' + row.user + '</td><td>' + row.ts + '</td></tr>');
    }
  });
}

function saveAs() {
  var name = prompt('Enter a name:', progData.name);
  if (name == null) {
    return;
  }
  if (name) {
    progData.name = name;
    saveProgram();
  } else {
    warningBox('Please enter a name');
  }
}

function currentTime() {
  var now = new Date();
  return now.toLocaleTimeString() + ' ' + now.toLocaleDateString();
}

function saveProgram() {
  $.ajax({
    type: "POST",
    url: "ajax.php",
    data: {'json': JSON.stringify(progData)},
    beforeSend: function(jqXHR, settings) {
      $('#save_status').html('Saving...');
    },
    dataType: "json",
    success: function(data, textStatus, jqxhr) {
      $('#save_status').html(progData.name + ' saved at ' + currentTime());
    },
    error: function(jqxhr, textStatus, error) {
      $('#save_status').html(textStatus);
      console.dir(jqxhr);
      console.dir(error);
    }});
}

// create new program template from available templates
function createNew() {
  $('#templateSelector').show(500);

  // The select depends on the onchange event to load a config, so we
  // need to reset it.
  $('#templateSelect').val('');
  $('#versionPicker').hide();
  $('#nameEntry').hide();
  $('#datePicker').hide();
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

// called when a change is made to unassigned_talks or progData.
function refresh() {
  drawProgram();
  drawTalks();
  addDrag();
}

// parse JSON file to create initial program structure
function getConfig(name, existing) {
  $.getJSON(name, function(data) {
    setProgData(data);

    if (existing) {
      $('#uploadmenu').show();
      $('#setupPrompts').hide();
      refresh();
      $('#parent').show(500);
      enableMenus();
      return;
    }
    $('#templateSelector').hide();
    $('#nameEntry').show(500);
  })
    .fail(function(jqxhr, textStatus, error) {
      console.dir(jqxhr);
      warningBox('There was a problem with this conference template. Please try another.');
  });
}

// For new programs, add a name to progData
function addName() {
  if ($('#inputName').val() === "") {
    warningBox('Please enter a name');
    return;
  }
  progData.name = $('#inputName').val();
  $('#nameEntry').hide();
  $('#datePicker').show(500);
  createDatePicker(progData.days.length);
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

function startEditor() {
  refresh();
  $('#setupPrompts').hide();
  $('#uploadmenu').show();
  $('#parent').show(500);
  enableMenus();
}

// Function to fetch json/accepted_demo.json and use that as
// accepted talks. This is for demo only.
function useDemoTalks() {
  $.getJSON('json/accepted_demo.json', function(data) {
    if (!mergeTalks(data)) {
      alert('there was a problem using this file');
      return;
    }
    startEditor();
  })
  .fail(function(jqxhr, textStatus, error) {
    warningBox('There was a problem with this demo. Unable to recover.');
  });
}

// Upload JSON file of talks and parse.
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
      if (!mergeTalks(data)) {
        console.log('failed to merge');
        evt.target.value = '';
        return;
      }
      $('#uploadTalksModal').modal('hide');
      startEditor();
    } catch (ee) {
      warningBox('Unable to parse file as JSON.');
      console.dir(ee);
      evt.target.value = '';
      return;
    }
  }
  reader.readAsText(file, 'UTF-8');
}

// Make authors an array of strings
function splitAuthors(val) {
  var re = /\s+and\s+|\s*;\s*/;
  return val.split(re);
}


// Merge the data from websubrev into the unassigned_talks
// data structure. There is no duplicate elimination.
function mergeTalks(data) {
  if (!data.hasOwnProperty('acceptedPapers') || !Array.isArray(data.acceptedPapers)) {
    warningBox('JSON file is not websubrev format.');
    return false;
  }
  var acceptedPapers = data.acceptedPapers;

  for (var i = 0; i < acceptedPapers.length; i++) {
    var paper = acceptedPapers[i];

    if (!paper.hasOwnProperty('title') || !paper.hasOwnProperty('authors')) {
      console.log('JSON file has a paper with a missing title or authors');
      warningBox('JSON file has a paper with a missing title or authors');
      return false;
    }

    if (!paper.hasOwnProperty('category')) {
      paper.category = 'Uncategorized';
    }
    paper.id = "talk-" + createUniqueId();
    paper.authors = splitAuthors(paper.authors);
  }

  // create map from category name to array of talks for that category
  var categoryMap = {};

  // First start with the existing unassigned_talks array.
  for (var i = 0; i < progData.config.unassigned_talks.length; i++) {
    var category = progData.config.unassigned_talks[i];
    categoryMap[category.name] = category.talks;
  }
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

  // Make sure it has an empty uncategorized category.
  if (categoryList.length == 0) {
    categoryList.push({'name': 'Uncategorized', 'talks':[], 'id': 'category-0'});
  }
  progData.config.unassigned_talks = categoryList;
  return true;
}

// Show modal for uploading from websubrev.
function showWebsubrevUpload() {
  $('#uploadTalksModal').modal();
}

// Style warnings and error message for better visibility to user
function warningBox(text) {
  $('#modal-message').text(text);
  $('#errorBox').modal();
}

// Custom helper for generating droppable div (i.e. distinguishing between sessions that can accept talks and those that can't)
Handlebars.registerHelper('empty', function(data, options) {
  if (data && data.length >= 0) {
    return new Handlebars.SafeString('<div class="session-talks" data-placeholder="Drag talks to this session">' + options.fn(this) + '</div>');
  }
});

// Add dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll(".category"));
  var sessions = Array.prototype.slice.call(document.querySelectorAll(".session-talks"));
  var containers = talks.concat(sessions);

  dragula(containers).on('drop', function(el, target, source, sibling) {
    if (target.classList.contains('session-talks')) {
      // hide drag & drop hint
      target.firstChild.data = '';
      target.style.border = '';

      // BUG/TODO: only an example of how to calculate length; will need to be changed for production
//      if (target.childNodes.length == 5) {
//        var start = moment("10:55", "HH:MM");
//        var end = moment("11:35", "HH:MM");
//        warningBox('diff is ' + end.diff(start));
//        warningBox('Are you sure you want more than 3 talks in a session?');
//      }
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
  var talkObj = findObj(el.id, progData);
  if (talkObj === false) {
    console.log('unable to find talk in progData');
    return false;
  }

  // sourceArray and targetArray point to a talks array, either in a
  // category or a session.
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
  sourceTalks.splice(sourceIndex, 1);

  var targetTalks = targetObj.talks;

  // If sibling is null then put at end of targetTalks
  // If sibling is not null, insert before that
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
    }
  }
  return true;
}

// Save a talk. This may come from an edit on an existing talk or a new
// talk that was added. If the id is empty then it's a new talk.
// TODO: validate the authors, title, and urls.
function saveTalk() {
  var newTitle = $('#newTalkTitle').val();
  if (!newTitle) {
    alert('Title is required');
    return;
  }
  var talkId = $('#talkId').val();
  if (talkId === "") {
    var talk = {};
    talk.id = "talk-" + createUniqueId();
  } else { // an existing talk.
    var talk = findObj(talkId, progData);
  }
  talk.title = newTitle;
  $('#editTalkBox').modal('hide');
  talk.authors = splitAuthors($('#newTalkAuthor').val());

  // TODO: handle affiliations
  talk.affiliations = $('#newTalkAffiliation').val();

  var category = $('#newTalkCategory').children(':selected');
  talk.category = category.text();
  talk.paperUrl = $('#paperUrl').val();
  if (talkId === "") {
    var categoryIndex = new Number(category.attr('value'));
    progData.config.unassigned_talks[categoryIndex].talks.unshift(talk);
  }
  refresh();
}

// Delete a talk from progData and redraw.
function deleteTalk() {
  if (!$('#deleteTalkWarning').is(':visible')) {
    $('#deleteTalkWarning').show();
    $('#talkDeleteButton').text('Really delete the paper');
    return;
  }
  $('#editTalkBox').modal('hide');
  var talkId = $('#talkId').val();

  // This is tricky because we have to find the talk by id and delete
  // it wherever we find it.
  var unassigned_talks = progData.config.unassigned_talks;
  for (var i = 0; i < unassigned_talks.length; i++) {
    var talkIndex = unassigned_talks[i].talks.findIndex(function(el) {
      return el.id === talkId;
    });
    if (talkIndex >= 0) {
      unassigned_talks[i].talks.splice(talkIndex, 1);
      refresh();
      return;
    }
  }
  // We didn't find it in unassigned_talks, so check the sessions.
  for (var dayIndex = 0; dayIndex < progData.days.length; dayIndex++) {
    var day = progData.days[dayIndex];
    for (var slotIndex = 0; slotIndex < day.timeslots.length; slotIndex++) {
      var timeSlot = day.timeslots[slotIndex];
      for (var sessionIndex = 0; sessionIndex < timeSlot.sessions.length; sessionIndex++) {
        var session = timeSlot.sessions[sessionIndex];
        if (session.hasOwnProperty('talks')) {
          var talkIndex = session.talks.findIndex(function(el) {
            return el.id === talkId;
          });
          if (talkIndex >= 0) {
            session.talks.splice(talkIndex, 1);
            refresh();
            return;
          }
        }
      }
    }
  }
}

// Populate categories from current config in add talk modal
function showTalkEditor(id) {
  // Remove all categories in case loop has already been triggered, so you don't get duplicate categories
  $('#deleteTalkWarning').hide();
  $('#talkDeleteButton').text('Delete talk');
  $('#newTalkCategory').find('option').remove().end()

  for (var i = 0; i < progData.config.unassigned_talks.length; i++) {
    $('#newTalkCategory').append($('<option>', {
      value:i, text:progData.config.unassigned_talks[i].name
    }));
  }
  $('#talkId').val(id);

  if (id === "") { // then we're adding a new talk.
    $('#talkDeleteButton').hide();
    $('#newTalkTitle').val('');
    $('#newTalkAuthor').val('');
    $('#newTalkAffiliation').val('');
    $('#addTalkTitle').text('Add a new talk');
    $('#paperUrl').val('');
  } else {
    $('#talkDeleteButton').show();
    var talkObj = findObj(id, progData);
    $('#newTalkTitle').val(talkObj.title);
    $('#newTalkAuthor').val(talkObj.authors.join(' and '))
    $('#newTalkAffiliation').val(talkObj.affiliations);
    $('#addTalkTitle').text('Edit a talk');
    $('#paperUrl').val(talkObj.paperUrl);
  }
}

// Prepopulate edit session modal with relevant fields from parent div of clicked edit button
function editSession(dayIndex, slotIndex, sessionIndex) {
  $('#deleteSessionWarning').hide();
  $('#deleteSessionButton').text('Delete session');
  var sessionObj = progData.days[dayIndex].timeslots[slotIndex].sessions[sessionIndex];
  if (progData.days[dayIndex].timeslots[slotIndex].sessions.length < 2) {
    // Can't delete the only session in a timeslot.
    $('#deleteSessionButton').hide();
  } else {
    $('#deleteSessionButton').show();
  }
  $('#currentDayIndex').val(dayIndex);
  $('#currentSlotIndex').val(slotIndex);
  $('#currentSessionIndex').val(sessionIndex);
  $('#currentSessionTitle').val(sessionObj.session_title);

  if (sessionObj.moderator) {
    $('#currentSessionModerator').val(sessionObj.moderator);
  } else {
    $('#currentSessionModerator').val('');
  }

  if (sessionObj.location && sessionObj.location.name) {
    $('#currentSessionLocation').val(sessionObj.location.name);
  } else {
    $('#currentSessionLocation').val('');
  }
}

// Function to add a timeslot to a day. This will be called to populate
// the modal for adding a timeslot.
function prepareAddTimeslotToDay(dayIndex) {
  $('#timeSlotWarning').hide();
  $('#dayIndex').val(dayIndex);
  var lastSlot = progData.days[dayIndex].timeslots[progData.days[dayIndex].timeslots.length -1];
  $('#newStartTime').val('');
  $('#newEndTime').val('');

// TODO: restrict times based on times of prior/next time slot? would be ideal but may also not be compatible with timepicker - further research needed
  $('#timeslotDiv .time').timepicker({
    'forceRoundTime': true,
    'show2400': true,
    'minTime': '00:00',
    'maxTime': '24:00',
    'showDuration': false,
    'step': 5,
    'timeFormat': 'G:i'
  });
  var getTimeDiv = document.getElementById('timeslotDiv');
  var timeSlotInputs = new Datepair(getTimeDiv);
}

// Simple utility function to convert HH:MM to just minutes. In other
// words it returns HH * 60 + MM, so that times can be compared
// easily.
function hmToMinutes(val) {
  var parts = val.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Add a timeslot to a day, called to populate the modal for adding a timeslot.
function addTimeslotToDay() {
  var startTime = $("#newStartTime").val();
  var endTime = $("#newEndTime").val();
  if (!startTime || !endTime) {
    $('#timeSlotWarning').show();
    return;
  }
  $('#addTimeslot').modal('hide');
  var dayIndex = $("#dayIndex").val();
  var numTracks = parseInt($("#selectSessionCount").val());

  var timeslot = {"starttime": startTime,
                  "endtime": endTime,
                  "sessions": []};
  var withTalks = $("#includeTalks").prop("checked");

  for (var i = 0; i < numTracks; i++) {
    var session = {"id": "session-" + createUniqueId(),
                   "session_title": "Edit to change session title " + i};

    if (withTalks) {
      session.talks = [];
    }
    timeslot.sessions.push(session);
  }

  if (numTracks > 1) {
    timeslot['twosessions'] = true;
  }

  // Timeslots are ordered by start time and may be overlapping.
  var timeslots = progData.days[dayIndex].timeslots;
  var startMinutes = hmToMinutes(startTime);
  var position = -1;
  for (var i = 0; i < timeslots.length; i++) {
    // Check if timeslots[i] has a start time after the existing one.
    // If so then insert before the current timeslot.
    if (hmToMinutes(timeslots[i].starttime) > startMinutes) {
      position = i;
      timeslots.splice(i, 0, timeslot);
      break;
    }
  }
  if (position == -1) {
    // Then it belongs at the end because it is after everything else.
    timeslots.push(timeslot);
  }
  refresh();
  document.getElementById(timeslot.sessions[0].id).scrollIntoView();
}

// dayIndex is the index in the days array, and slotIndex is the index in
// the timeslots array under the day. This makes it easy to refer to the
// corresponding timeslot.
function editTimeslot(dayIndex, slotIndex) {
  $('#deleteTimeslotWarning').hide();
  $('#deleteTimeslotButton').text('Delete time slot');
  var timeslot = progData.days[dayIndex].timeslots[slotIndex];
  $('#timeslotDayIndex').val(dayIndex);
  $('#timeslotIndex').val(slotIndex);
  $('#makeDualSession').prop('checked', false);

  if (timeslot.sessions.length === 1) {
    // enable the checkbox to add a session.
    $('#addTrackToSession').show();
  } else {
    $('#addTrackToSession').hide();
  }

  $('#currentStartTime').val(timeslot.starttime);
  $('#currentEndTime').val(timeslot.endtime);

  $('#timeDiv .time').timepicker({
    'forceRoundTime': true,
    'minTime': '6:00',
    'maxTime': '24:00',
    'show2400': true,
    'showDuration': false,
    'step': 5,
    'timeFormat': 'G:i'
  });

  var getTimeDiv = document.getElementById('timeDiv');
  var timeSlotInputs = new Datepair(getTimeDiv);
}

// Sort the timeslots by starttime. This is called when a new timeslot
// is added or when a timeslot is edited.
function sortTimeslots(dayIndex) {
  var timeslots = progData.days[dayIndex].timeslots;
  timeslots.sort(function(a, b) {
    var aMinutes = hmToMinutes(a.starttime);
    var bMinutes = hmToMinutes(b.starttime);
    if (aMinutes < bMinutes) return -1;
    if (aMinutes > bMinutes) return 1;
    return 0;
  });
}

// Save edited timeslot
function saveTimeslot() {
  var dayIndex = $("#timeslotDayIndex").val();
  var slotIndex = $("#timeslotIndex").val();
  var timeSlot = progData.days[dayIndex].timeslots[slotIndex];
  timeSlot.starttime = $("#currentStartTime").val();
  timeSlot.endtime = $("#currentEndTime").val();

  if ($('#makeDualSession').is(':checked') && timeSlot.sessions.length === 1) {
    // Add a new (empty) session. If the existing session has talks,
    // then the new one should too.
    var newSession = {"session_title": "Edit session to change title",
                      "id": "session-" + createUniqueId()};
    if (timeSlot.sessions[0].hasOwnProperty('talks')) {
      newSession.talks = [];
    }
    timeSlot.sessions.push(newSession);
    timeSlot.twosessions = true;
  }

  // Sort the timeslots again, because they may be out of order if startTime changed.
  sortTimeslots(dayIndex);
  refresh();
}

// If a session is about to be deleted (either by deleting the one session
// or by deleting the timeslot), then return the talks to the unassigned_talks
// area.
function moveTalksToUnassigned(session) {
  if (session.hasOwnProperty('talks')) {
    for (var i = 0; i < session.talks.length; i++) {
      var talk = session.talks[i];
      // Find the category in unassigned_talks that matches this talk.
      var category = progData.config.unassigned_talks.find(function(cat) {
        return cat.name === talk.category;
      });
      if (category === null) {
        category = progData.config.unassigned_talks[0];
      }
      category.talks.push(talk);
    }
  }
}

function deleteTimeslot() {
  if (!$('#deleteTimeslotWarning').is(':visible')) {
    $('#deleteTimeslotWarning').show();
    $('#deleteTimeslotButton').text('Really delete time slot');
    return;
  }

  $('#editTimeslot').modal('hide');
  var dayIndex = $("#timeslotDayIndex").val();
  var slotIndex = $("#timeslotIndex").val();
  var timeSlot = progData.days[dayIndex].timeslots[slotIndex];

  for (var i = 0; i < timeSlot.sessions.length; i++) {
    // Remove any talks in the sessions.
    moveTalksToUnassigned(timeSlot.sessions[i]);
  }

  // Actually remove the timeslot.
  progData.days[dayIndex].timeslots.splice(slotIndex, 1);
  refresh();
}

// Delete a session. If this is the only session for the timeslot, then defer
// with a warning to delete the timeslot instead.
function deleteSession() {
  if (!$('#deleteSessionWarning').is(':visible')) {
    $('#deleteSessionWarning').show();
    $('#deleteSessionButton').text('Really delete session');
    return;
  }
  var dayIndex = $('#currentDayIndex').val();
  var slotIndex = $('#currentSlotIndex').val();
  var sessionIndex = $('#currentSessionIndex').val();
  var timeSlot = progData.days[dayIndex].timeslots[slotIndex];

  if (timeSlot.sessions.length === 1) {
    warningBox('You should delete the timeslot instead.');
    $('#editSessionBox').modal('hide');
    return;
  }

  $('#editSessionBox').modal('hide');
  var sessionObj = timeSlot.sessions[sessionIndex];
  moveTalksToUnassigned(sessionObj);
  timeSlot.sessions.splice(sessionIndex, 1);
  timeSlot.twosessions = false;
  refresh();
}

// Submit button for edit session
function saveSession() {
  var dayIndex = $('#currentDayIndex').val();
  var slotIndex = $('#currentSlotIndex').val();
  var sessionIndex = $('#currentSessionIndex').val();
  var sessionObj = progData.days[dayIndex].timeslots[slotIndex].sessions[sessionIndex];
  var session_title = $('#currentSessionTitle').val();

  // Session title is required.
  if (session_title === "") {
    warningBox('Session title is required.');
    return;
  }
  sessionObj.session_title = session_title;
  var locationName = $('#currentSessionLocation').val();

  if (locationName) {
    sessionObj.location = {'name': locationName};
  } else {
    delete sessionObj.location;
  }
  var sessionModerator = $('#currentSessionModerator').val();

  if (sessionModerator) {
    sessionObj.moderator = sessionModerator;
  } else {
    delete sessionObj.moderator;
  }
  refresh();
}

// Download edited JSON program
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

// From https://gist.github.com/andrei-m/982927
function levenshtein_distance (a, b) {
  if(a.length == 0) return b.length;
  if(b.length == 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
}

// Start the import process for DOIs from crossref.org. The user
// is prompted to enter from a list, and that causes a well-formed query
// to be sent to api.crossref.org. Note that you can't simply query for
// Crypto 2017 but you need the full name with "Advances in cryptology".
function startImportDOIs() {
  $('#doiStatus').text('');
  $('#resultList').find('li').remove().end()
  $('.progress').hide();
  $('#doiCloseBtn').removeClass('btn-success');
  $('#doiCloseBtn').addClass('btn-default');
  $('#doiSearchBtn').removeClass('disabled');
  $('#doiSearchBtn').addClass('btn-success');
  $('#doiSearchBtn').removeClass('btn-default');
  $('#importDOISelection').modal();
}

// Construct the URL to look up a talk in crossref. We use only the
// first author.
function getTalkUrl(talk) {
  var url = "https://api.crossref.org/works?rows=20&query.title=";
  url += talk.title.replace(' ', '+');
  url += '&query.author=' + talk.authors[0].replace(' ', '+');
  return url;
}

// callback in the success function of a DOI lookup.
// the talk is found in jqXHR because it will be set in
// the beforeSend function.
function matchDOI(data, textStatus, jqXHR) {
  for (var i = 0; i < data.message.items.length; i++) {
    var item = data.message.items[i];
    var distance = levenshtein_distance(jqXHR.talk.title.toLowerCase(),
                                        item.title[0].toLowerCase());
    // We searched on the title and first author, so if the title
    // is pretty close and the number of authors is correct, we
    // take it as a match. The number 4 was pulled out of the
    // backside of a mule.
    if (distance < 4 && item.author &&
        jqXHR.talk.authors.length == item.author.length) {
      jqXHR.talk.paperUrl = item.URL;
      return true;
    } else {
      console.log(i + ':' + distance + ':' + item.title[0]);
    }
  }
  return false;
}

// This class updates a boostrap progress bar with a given id.
function ProgressMonitor(totalCount) {
  if (totalCount == 0) {
    $('#doiStatus').text('No talks to look up');
  } else {
    $('#doiStatus').text('');
  }
  $('.progress').show();
  $('#doiProgress').show();
  $('#doiProgress').css('width', '0%');
  $('#doiProgress').prop('aria-valuenow', 0);
  $('#doiProgress').prop('aria-valuemax', 100);
  this.totalCount = totalCount;
  this.failureCount = 0;
  this.successCount = 0;
  this.updateWidget = function() {
    var msg = this.successCount + ' found out of ' + this.totalCount;
    var val = Math.floor(100 * (this.successCount + this.failureCount) / this.totalCount);
    $('#doiProgress').prop('aria-valuenow', val);
    $('#doiProgress').css('width', String(val) + '%');
    $('#doiProgress').html(val + '%');
    if (this.totalCount == this.failureCount + this.successCount) {
      msg = 'Finished! ' + msg;
    }
    $('#doiStatus').text(msg);
  }
  this.reportSuccess = function() {
    this.successCount++;
    this.updateWidget();
  }
  this.reportFailure = function() {
    this.failureCount++;
    this.updateWidget();
  }
}

// Fire an ajax request for every talk that doesn't already have
// a paperUrl field. This includes unassigned talks as well as
// already scheduled talks.
function findDOIs() {
  $('#doiSearchBtn').addClass('disabled');
  $('#doiSearchBtn').removeClass('btn-success');
  $('#doiSearchBtn').addClass('btn-default');
  var talks = [];
  progData.config.unassigned_talks.forEach(function(category) {
    category.talks.forEach(function(talk) {
      if (!talk.hasOwnProperty('paperUrl')) {
        talks.push(talk);
      }
    });
  });
  progData.days.forEach(function(day) {
    day.timeslots.forEach(function(timeslot) {
      if (timeslot.hasOwnProperty('sessions')) {
        timeslot.sessions.forEach(function(session) {
          if (session.hasOwnProperty('talks')) {
            session.talks.forEach(function(talk) {
              if (!talk.hasOwnProperty('paperUrl')) {
                talks.push(talk);
              }
            });
          }
        });
      }
    });
  });
  var progressMonitor = new ProgressMonitor(talks.length);
  // This was constructed after reading
  // https://stackoverflow.com/questions/24705401/jquery-ajax-with-array-of-urls
  $.when.apply($, talks.map(function(talk) {
    var talkUrl = getTalkUrl(talk);
    // We save the talk in the jqXHR so we can update
    // the paperUrl if it finds a good enough match for the metadata.
    return $.ajax({
      url: talkUrl,
      beforeSend: function(jqXHR, settings) {
        jqXHR.talk = talk;
      },
      success: function(data, textStatus, jqXHR) {
        if (matchDOI(data, textStatus, jqXHR)) {
          progressMonitor.reportSuccess();
        } else {
          progressMonitor.reportFailure();
        }
      },
      fail: function(jqXHR, textStatus, errorThrown) {
        progressMonitor.reportFailure();
      }
    });
  })).always(function() {
    $('#doiCloseBtn').addClass('btn-success');
    $('#doiCloseBtn').removeClass('btn-default');
    console.log('finished all lookups');
    refresh();
  });;
}

// NOTE: DEBUG ONLY, remove in production. bypasses other steps so all you have to do is upload talks
// function debugStart() {
//   createNew();
//   getConfig('./json/crypto_config.json');
//   $('#uploadTalks').show(500);
// }

// executes functions once document is ready
$(document).ready(function() {
  document.getElementById('uploadTalksSelector').addEventListener('change', uploadTalks);

  // NOTE: for debug purposes only, remove in production
  // debugStart();

  // compile templates to html
  var theTemplateScript = $("#program-template").html();
  progTemplate = Handlebars.compile(theTemplateScript);
  theTemplateScript = $("#talks-template").html();
  talksTemplate = Handlebars.compile(theTemplateScript);
  Handlebars.registerPartial("talk", $('#talk-partial').html());
  disableMenus();
  // Register tooltip plugin.
  $('body').tooltip({
    trigger: 'hover',
    selector: '[data-toggle="tooltip"]'
  });

  // Make dropdown menus respond to hover.
  $('ul.nav li.dropdown').hover(function() {
    $(this).find('.dropdown-menu').stop(true, true).delay(100).fadeIn(100);
  }, function() {
    $(this).find('.dropdown-menu').stop(true, true).delay(100).fadeOut(100);
  });
  $('#topNavList a').on('click', function() {
    $('.dropdown-menu').fadeOut(100);
  });
});
