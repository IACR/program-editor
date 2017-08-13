// TODO: add notification for when browser is too small using media breakpoint


// Create global variables: to store parsed JSON files for use in templates (progData), the template for the program (progTemplate), and the template for the unassigned talks listed at left (talksTemplate)
var progData;
var progTemplate;
var talksTemplate;

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
      $('#versionList').append('<tr><td><a href=javascript:getConfig("ajax.php?id=' + row.id + '",true);>' + row.name + '</a></td><td>' + row.user + '</td><td>' + row.ts + '</td></tr>');
    }
  });
}

// TODO: move to more appropriate spot
// saves program
function saveProgram() {
  $.ajax({
    type: "POST",
    url: "ajax.php",
    data: {'json': JSON.stringify(progData)},
    beforeSend: function(jqXHR, settings) {
      $('#save_status').html('saving');
    },
    dataType: "json",
    success: function(data, textStatus, jqxhr) {
      $('#save_status').html('done');
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
      return;
    }
    $('#templateSelector').hide();
    $('#nameEntry').show(500);
  })
  .fail(function(jqxhr, textStatus, error) {
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

// make authors an array of strings
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

  // make sure it has an empty uncategorized category.
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
    }
  }
  return true;
}

// Save a talk. This may come from an edit on an existing talk or a new
// talk that was added. If the id is empty then it's a new talk.
function saveTalk() {
  var talkId = $('#talkId').val();
  if (talkId === "") {
    var talk = {};
    talk.id = "talk-" + createUniqueId();
  } else { // an existing talk.
    var talk = findObj(talkId, progData);
  }

  talk.title = $('#newTalkTitle').val();
  talk.authors = splitAuthors($('#newTalkAuthor').val());

  // TODO: handle affiliations
  talk.affiliations = $('#newTalkAffiliation').val();

  var category = $('#newTalkCategory').children(':selected');
  talk.category = category.text();
  if (talkId === "") {
    var categoryIndex = new Number(category.attr('value'));
    progData.config.unassigned_talks[categoryIndex].talks.unshift(talk);
  }
  refresh();
}

// Delete a talk from progData and redraw.
function deleteTalk() {
  // TODO: resolve window.confirm issue (see github issue #80)
  if (!window.confirm("Are you sure you want to delete the talk?")) {
    $('#editTalkBox').modal('hide');
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

// populate categories from current config in add talk modal
function showTalkEditor(id) {
  // remove all categories in case loop has already been triggered, so you don't get duplicate categories
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
  } else {
    $('#talkDeleteButton').show();
    var talkObj = findObj(id, progData);
    $('#newTalkTitle').val(talkObj.title);
    $('#newTalkAuthor').val(talkObj.authors.join(' and '))
    $('#newTalkAffiliation').val(talkObj.affiliations);
    $('#addTalkTitle').text('Edit a talk');
  }
}

// prepopulate edit session modal with relevant fields from parent div of clicked edit button
function editSession(dayIndex, slotIndex, sessionIndex) {
  console.log('editing session='+dayIndex+':'+slotIndex+':'+sessionIndex);
  var sessionObj = progData.days[dayIndex].timeslots[slotIndex].sessions[sessionIndex];
  console.dir(sessionObj);

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
  $('#dayIndex').val(dayIndex);
  var lastSlot = progData.days[dayIndex].timeslots[progData.days[dayIndex].timeslots.length -1];
//  $('#newStartTime').val(lastSlot.endtime);

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

// save edited timeslot
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
  if (!window.confirm("Are you sure you want to delete this timeslot?")) {
    $('#editTimeslot').modal('hide');
    return;
  }

  $('#editTimeslot').modal('hide');
  var dayIndex = $("#timeslotDayIndex").val();
  var slotIndex = $("#timeslotIndex").val();
  var timeSlot = progData.days[dayIndex].timeslots[slotIndex];

  for (var i = 0; i < timeSlot.sessions.length; i++) {
    // remove any talks in the sessions.
    moveTalksToUnassigned(timeSlot.sessions[i]);
  }

  // Actually remove the timeslot.
  progData.days[dayIndex].timeslots.splice(slotIndex, 1);
  refresh();
}

// Delete a session. If this is the only session for the timeslot, then defer
// with a warning to delete the timeslot instead.
function deleteSession() {
  var dayIndex = $('#currentDayIndex').val();
  var slotIndex = $('#currentSlotIndex').val();
  var sessionIndex = $('#currentSessionIndex').val();
  var timeSlot = progData.days[dayIndex].timeslots[slotIndex];

  if (timeSlot.sessions.length === 1) {
    warningBox('You should delete the timeslot instead.');
    $('#editSessionBox').modal('hide');
    return;
  }

  if (!window.confirm("Are you sure you want to delete the session?")) {
    $('#editSessionBox').modal('hide');
    return;
  }

  $('#editSessionBox').modal('hide');
  var sessionObj = timeSlot.sessions[sessionIndex];
  console.dir(sessionObj);
  moveTalksToUnassigned(sessionObj);
  timeSlot.sessions.splice(sessionIndex, 1);
  timeSlot.twosessions = false;
  refresh();
}

// submit button for edit session
function saveSession() {
  var dayIndex = $('#currentDayIndex').val();
  var slotIndex = $('#currentSlotIndex').val();
  var sessionIndex = $('#currentSessionIndex').val();
  var sessionObj = progData.days[dayIndex].timeslots[slotIndex].sessions[sessionIndex];
  console.log('editing session');
  console.dir(sessionObj);
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
  console.dir(sessionObj);
  // TODO: after drag/drop and edit session, 'drag talks' placeholder reappears
  refresh();
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

  // Register tooltip plugin.
  $('body').tooltip({
    selector: '[data-toggle="tooltip"]'
  });

  // Make dropdown menus respond to hover.
  $('ul.nav li.dropdown').hover(function() {
    $(this).find('.dropdown-menu').stop(true, true).delay(100).fadeIn(100);
  }, function() {
    $(this).find('.dropdown-menu').stop(true, true).delay(100).fadeOut(100);
  });
});
