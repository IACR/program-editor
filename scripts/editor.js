// TODO: add notification for when browser is too small using media breakpoint

// Create global variables: to store parsed JSON files for use in templates (progData), the template for the program (progTemplate), and the template for the unassigned talks listed at left (talksTemplate)
var progData;
var progTemplate;
var talksTemplate;

// This is called when the app is opened, and disables menu items that only make
// sense if a program is being edited.
function disableMenus() {
  $('#editMetadataMenu').addClass('disabled');
  $('#saveMenu').addClass('disabled');
  $('#saveAsMenu').addClass('disabled');
  $('#deleteMenu').addClass('disabled');
  $('#downloadMenu').addClass('disabled');
  $('#downloadPDFMenu').addClass('disabled');
  $('#importTalksMenu').addClass('disabled');
  $('#uploadTalksMenu').addClass('disabled');
  $('#importDOIMenu').addClass('disabled');
}

// This is called when a program is loaded to edit.
function enableMenus() {
  $('#save_status').text(progData.name);
  $('#editMetadataMenu').removeClass('disabled');
  $('#saveMenu').removeClass('disabled');
  $('#saveAsMenu').removeClass('disabled');
  $('#deleteMenu').removeClass('disabled');
  $('#downloadMenu').removeClass('disabled');
  $('#downloadPDFMenu').removeClass('disabled');
  $('#importTalksMenu').removeClass('disabled');
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
          if (!timeslots[j]['sessions'][k].hasOwnProperty('id')) {
            timeslots[j]['sessions'][k].id = 'session-' + createUniqueId();
          }
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
      $('#versionList').append('<tr><td><a class="progName" href=javascript:getConfig("ajax.php?id=' + row.id + '",true);>' + row.name + '</a></td><td>' + row.username + '</td><td>' + row.ts + '</td></tr>');
    }
  });
}

function showDeleteProgram() {
  if ($('#deleteMenu').hasClass('disabled')) {
    return false;
  }
  $('#deleteProgramModal').modal();
}

function showEditMetadata() {
  if ($('#showMetadataMenu').hasClass('disabled')) {
    return false;
  }
  $('#newName').val(progData.name);
  document.getElementById('dateChange').selectedIndex = 0;
  document.getElementById('shiftDates').value = 0;
  document.getElementById('addDayOption').selectedIndex = 0;
  document.getElementById('deleteDayOption').selectedIndex = 0;
  $('#editMetadataModal').modal();
  updateNewDates();
}

function reallyDeleteProgram() {
  if (!progData.hasOwnProperty('database_id')) {
    $('#delete_status').text('Program was never saved.');
    return;
  }
  $.ajax({
    type: "POST",
    url: "ajax.php",
    data: {'delete': progData.database_id},
    beforeSend: function(jqXHR, settings) {
      $('#delete_status').text('Deleting...');
    },
    dataType: "json",
    success: function(data, textStatus, jqxhr) {
      console.dir(data);
      if (data['error']) {
        $('#delete_status').text(data['error']);
      } else {
        $('#delete_status').text(progData.name + ' deleted');
        navigateToHome();
      }
    },
    error: function(jqxhr, textStatus, error) {
      $('#delete_status').text(textStatus);
      console.dir(jqxhr);
      console.dir(error);
    }});
}


function saveAs() {
  if ($('#saveAsMenu').hasClass('disabled')) {
    return false;
  }


  if (progData.hasOwnProperty('database_id')) {
    delete progData.database_id;
  }
  var newName = prompt("Enter a name for new copy", "Copy of " + progData.name);
  if (newName !== null) {
    progData.name = newName;
    saveProgram();
  }
}

function currentTime() {
  var now = new Date();
  return now.toLocaleTimeString() + ' ' + now.toLocaleDateString();
}

function saveProgram() {
  if ($('#saveMenu').hasClass('disabled')) {
    console.log('disabled');
    return false;
  }
  $.ajax({
    type: "POST",
    url: "ajax.php",
    data: {'json': JSON.stringify(progData)},
    beforeSend: function(jqXHR, settings) {
      $('#save_status').html('Saving...');
    },
    dataType: "json",
    success: function(data, textStatus, jqxhr) {
      if (data['error']) {
        $('#save_status').html('Unable to save: ' + data['error']);
      } else {
        progData['database_id'] = data['database_id'];
        $('#save_status').html(progData.name + ' saved at ' + currentTime());
      }
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

// Called from the editMetadataModal to update new dates. This is
// triggered by onChange or onInput on the form elements.
function updateNewDates() {
  var startDate = moment(progData.days[0].date);
  var endDate = moment(progData.days[progData.days.length-1].date);
  $('#originalStartdate').text(startDate.format('YYYY-MM-DD (dddd)'));
  $('#originalEnddate').text(endDate.format('YYYY-MM-DD (dddd)'));
  var select = document.getElementById('dateChange');
  var changeType = select.options[select.selectedIndex].value;
  $('#shiftDateControl').hide();
  $('#addDayOption').hide();
  $('#deleteDayOption').hide();
  $('#deleteWarning').hide();
  if (changeType === '') {
    $('#newDates').hide();
  } else if (changeType === 'shift') {
    $('#newDates').show();
    $('#shiftDateControl').show();
    startDate.add($('#shiftDates').val(), 'd');
    endDate.add($('#shiftDates').val(), 'd');
  } else if (changeType === 'add') {
    $('#newDates').show();
    $('#addDayOption').show();
    var addChoice = $('#addDayOption').val();
    if (addChoice === 'before') {
      startDate.subtract(1, 'd');
    } else if (addChoice === 'after') {
      endDate.add(1, 'd');
    }
  } else if (changeType === 'delete') {
    $('#newDates').show();
    $('#deleteWarning').show();
    $('#deleteDayOption').show();
    var deleteChoice = $('#deleteDayOption').val();
    if (deleteChoice === 'first') {
      startDate.add(1, 'd');
    } else if (deleteChoice === 'last') {
      endDate.subtract(1, 'd');
    }
  }
  $('#newStartdate').val(startDate.format('YYYY-MM-DD'));
  $('#newEnddate').val(endDate.format('YYYY-MM-DD'));
  $('#newDisplayStartdate').text(startDate.format('YYYY-MM-DD (dddd)'));
  $('#newDisplayEnddate').text(endDate.format('YYYY-MM-DD (dddd)'));
}

// Called from the modal to edit metadata.
function saveMetadata() {
  var newName = $('#newName').val();
  if (newName === '') {
    alert('Name is required');
    return;
  }
  if (newName !== progData.name) {
    progData.name = newName;
    $('#save_status').text(progData.name);
  }
  // Updating dates is easy when it's a shift or add, but harder
  // when it is a delete because talks have to be sent to the
  // unassigned_list.
  var select = document.getElementById('dateChange');
  var changeType = select.options[select.selectedIndex].value;
  if (changeType === 'shift') {
    var theDate = moment($('#newStartdate').val());
    for (var i = 0; i < progData.days.length; i++) {
      progData.days[i].date = theDate.format('YYYY-MM-DD');
      theDate.add(1, 'd');
    }
  } else if (changeType === 'add') {
    if ($('#newStartdate').val() === progData.days[0].date) {
      // then we added a day at the end.
      progData.days.push({'date': $('#newEnddate').val(), 'timeslots': []});
    } else {
      progData.days.unshift({'date': $('#newStartdate').val(), 'timeslots': []});
    }
  } else if (changeType === 'delete') {
    // If there are any talks in sessions on that day, then we put
    // them back into unassigned_talks.
    var dayToDeleteIndex = -1;
    var dateToDelete = $('#deleteDayOption').val();
    if (dateToDelete === 'first') {
      dayToDeleteIndex = 0;
    } else if (dateToDelete === 'last') {
      dayToDeleteIndex = progData.days.length - 1;
    }
    if (dayToDeleteIndex >= 0) {
      var day = progData.days[dayToDeleteIndex];
      for (var i = 0; i < day.timeslots.length; i++) {
        if (day.timeslots[i].hasOwnProperty('sessions')) {
          for (var j = 0; j < day.timeslots[i].sessions.length; j++) {
            moveTalksToUnassigned(day.timeslots[i].sessions[j]);
          }
        }
      }
      progData.days.splice(dayToDeleteIndex, 1);
    }
  }
  $('#editMetadataModal').modal('hide');
  saveProgram();
  refresh();
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

// Data that is imported from cryptodb has a different schema
// than data from websubrev. We normalize it so that
// DOI => paperUrl (if it exists)
// URL => paperUrl (if DOI does not exist)
// presentationurl => slidesUrl
// youtube => videoURL
function canonicalizeCryptodb(data) {
  papers = data.acceptedPapers;
  for (var i = 0; i < papers.length; i++) {
    paper = papers[i];
    if ('DOI' in paper) {
      paper['paperUrl'] = 'https://doi.org/' + paper['DOI'];
    } else if ('URL' in paper) {
      paper['paperUrl'] = paper['URL'];
    }
    if ('youtube' in paper) {
      paper['videoUrl'] = 'https://youtube.com/watch?v=' + paper['youtube'];
    }
    if ('presentationurl' in paper) {
      paper['slidesUrl'] = paper['presentationurl'];
    }
  }
}

// Note that the format imported from FSE or CHES is different than
// the websubrev format. In particular, FSE and CHES have author
// affiliations, author IDs from cryptodb, and additional fields.
function importFSEorCHES() {
  var venue = $('#importSelect').val();
  if (venue === null) {
    warningBox('A conference must be selected');
    return false;
  }
  console.log('importing from ' + venue);
  let url = 'https://iacr.org/cryptodb/data/export/ajax.php?venue=' + venue;
  let elem = document.getElementById('importstartdate');
  if (elem.value) {
    url += '&startdate=' + elem.value;
  }
  elem = document.getElementById('importenddate');
  if (elem.value) {
    url += '&enddate=' + elem.value;
  }
  $.getJSON(url, function(data) {
    canonicalizeCryptodb(data);
    if (!mergeTalks(data)) {
      alert('there was a problem importing this data');
      return;
    }
    $('#importTalksModal').modal('hide');
    startEditor();
  })
  .fail(function(jqxhr, textStatus, error) {
    warningBox('There was a problem with this data. Unable to recover.');
  });
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

function useEmptyTalks() {
  progData.config.unassigned_talks = [{'name': 'Uncategorized', 'talks':[], 'id': 'category-0'}];
  startEditor();
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


// Merge the data from websubrev or cryptodb into the unassigned_talks
// data structure. There is no duplicate elimination.  The formats
// returned are different and each has its problems.  If websubrev
// changes to separate affiliations better, we could have affiliations
// associated to each author.
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
      console.dir(paper);
      warningBox('JSON file has a paper with a missing title or authors');
      return false;
    }

    if (!paper.hasOwnProperty('category')) {
      if (paper.hasOwnProperty('volume')) {
        paper.category = paper.volume;
      } else {
        paper.category = 'Uncategorized';
      }
    }
    if (paper.hasOwnProperty('pubkey')) {
      paper.id = "talk-" + paper.pubkey;
    } else {
      paper.id = "talk-" + createUniqueId();
    }
    if (Array.isArray(paper.authors)) { // TOSC or TCHES format
      var authorArray = [];
      var affiliations = [];
      paper.authors.forEach(function(a) {
        if (a instanceof String) {
          authorArray.push(a);
        } else if (a.hasOwnProperty('publishedasname')) {
          authorArray.push(a.publishedasname);
        }
        if (a.hasOwnProperty('affiliation')) {
          affiliations.push(a.affiliation);
        }
      });
      paper.authors = authorArray;
      if (affiliations.length) {
        paper.affiliations = affiliations.join('; ');
      }
    } else { // websubrev format.
      paper.authors = splitAuthors(paper.authors);
    }
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
function showWebsubrevUpload(obeyMenu) {
  if (obeyMenu && $('#uploadTalksMenu').hasClass('disabled')) {
    return false;
  }
  $('#uploadTalksModal').modal();
}

// Show modal for uploading from websubrev.
function showImportFSEorCHES(obeyMenu) {
  if (obeyMenu && $('#importTalksMenu').hasClass('disabled')) {
    return false;
  }
  $('#importTalksModal').modal();
}

// Style warnings and error message for better visibility to user
function warningBox(text) {
  $('#modal-message').text(text);
  $('#errorBox').modal();
}

// Custom helper for generating droppable div.  It works by testing
// to see if the data array exists. The isSession argument is used
// to distinguish between the case of a session and a category.
Handlebars.registerHelper('talkList', function(data, isSession, options) {
  if (data && data.length >= 0) {
    if (isSession) {
      return new Handlebars.SafeString('<div class="session-talks text-center" data-placeholder="Drag talks to this session">' + options.fn(this) + '</div>');
    } else {
      return new Handlebars.SafeString('<div class="category text-center" data-placeholder="Drag talks here to unschedule">' + options.fn(this) + '</div>');
    }
  }
});

Handlebars.registerHelper('formatDate', function(isodate) {
  return moment(isodate).format('YYYY-MM-DD (dddd)');
});

// Add dragula functionality
function addDrag() {
  var talks = Array.prototype.slice.call(document.querySelectorAll(".category"));
  var sessions = Array.prototype.slice.call(document.querySelectorAll(".session-talks"));
  var containers = talks.concat(sessions);

  dragula(containers).on('drop', function(el, target, source, sibling) {
    updateProgData(el, target, source, sibling);
    // We use this test to see if the source is now empty of
    // child elements, which indicates that we should redraw the hint
    // for an empty session or category. source.firstElementChild is
    // null if you just emptied the source in the drag.
    if (source.firstElementChild === null) {
      refresh();
    }
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
  if (currentNode == null) {
    return false;
  }
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
// TODO: validate the authors.
function saveTalk() {
  var isValidated = true;

  var newTitle = $('#newTalkTitle').val();
  var paperUrl = $('#paperUrl').val();
  var slidesUrl = $('#slidesUrl').val();
  var startTime = $('#currentTalkStartTime').val();
  var endTime = $('#currentTalkEndTime').val();
  // validating talk title, paper url, and slides url
  if (!newTitle) {
    $('#talkTitleWarning').show();
    isValidated = false;
  } else {
    $('#talkTitleWarning').hide();
  }
  if (paperUrl && !paperUrl.startsWith("http")) {
    $('#paperUrlWarning').show();
    isValidated = false;
  } else {
    $('#paperUrlWarning').hide();
  }
  if (slidesUrl && !slidesUrl.startsWith("http")) {
    $('#slidesUrlWarning').show();
    isValidated = false;
  } else {
    $('#slidesUrlWarning').hide();
  }

  // verifies that no validation warnings are showing
  if (!isValidated) {
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
  if (startTime) {
    talk.starttime = startTime;
  } else if (talk.starttime) {
    delete talk.starttime;
  }
  if (endTime) {
    talk.endtime = endTime;
  } else if (talk.endtime) {
    delete talk.endtime;
  }
  talk.authors = splitAuthors($('#newTalkAuthor').val());

  // TODO: handle affiliations
  talk.affiliations = $('#newTalkAffiliation').val();

  if (paperUrl) {
    talk.paperUrl = paperUrl;
  } else {
    if (talk.paperUrl) {
      delete talk.paperUrl;
    }
  }

  if (slidesUrl) {
    talk.slidesUrl = slidesUrl;
  } else {
    if (talk.slidesUrl) {
      delete talk.slidesUrl;
    }
  }

  if (talkId === "") {
    var categoryIndex = 0;
    let category = $('#newTalkCategory').children(':selected');
    if (category) {
      categoryIndex = new Number(category.attr('value'));
    }
    progData.config.unassigned_talks[categoryIndex].talks.unshift(talk);
  }
  $('#editTalkBox').modal('hide');
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
  $('#talkTitleWarning').hide();
  $('#paperUrlWarning').hide();
  $('#slidesUrlWarning').hide();
  $('#deleteTalkWarning').hide();
  $('#talkDeleteButton').text('Delete talk');
  $('#newTalkCategory').find('option').remove().end()
  if (id) {
    $('#talkTimeSelector').show();
    $('#categorySelector').hide();
  } else {
    $('#talkTimeSelector').hide();
    $('#categorySelector').show();
  }
  for (var i = 0; i < progData.config.unassigned_talks.length; i++) {
    $('#newTalkCategory').append($('<option>', {
      value:i, text:progData.config.unassigned_talks[i].name
    }));
  }
  $('#talkId').val(id);

  var defaultTime = '11:30';
  if (id === "") { // then we're adding a new talk.
    $('#talkDeleteButton').hide();
    $('#newTalkTitle').val('');
    $('#newTalkAuthor').val('');
    $('#newTalkAffiliation').val('');
    $('#addTalkTitle').text('Add a new talk');
    $('#paperUrl').val('');
    $('#slidesUrl').val('');
    $('#currentTalkStartTime').val('');
    $('#currentTalkEndTime').val('');
  } else {
    $('#talkDeleteButton').show();
    var talkObj = findObj(id, progData);
    if (talkObj.starttime) {
      defaultTime = talkObj.starttime;
    }
    $('#newTalkTitle').val(talkObj.title);
    $('#newTalkAuthor').val(talkObj.authors.join(' and '))
    $('#newTalkAffiliation').val(talkObj.affiliations);
    $('#addTalkTitle').text('Edit a talk');
    $('#paperUrl').val(talkObj.paperUrl);
    $('#slidesUrl').val(talkObj.slidesUrl);
    $('#currentTalkStartTime').val(talkObj.starttime);
    $('#currentTalkEndTime').val(talkObj.endtime);
    if (talkObj.starttime) {
      $('#currentTalkStartTime').val(talkObj.starttime);
    } else {
      $('#currentTalkStartTime').val('');
    }
    if (talkObj.endtime) {
      $('#currentTalkEndTime').val(talkObj.endtime);
    } else {
      $('#currentTalkEndTime').val('');
    }
  }
  $('#talkTimeDiv .time').timepicker({
    'forceRoundTime': true,
    'scrollDefault': defaultTime,
    'show2400': true,
    'minTime': '00:00',
    'maxTime': '24:00',
    'showDuration': false,
    'step': 1,
    'timeFormat': 'G:i'
  });
  $('#editTalkBox').modal();
}

// Save a category. This may come from an edit on an existing category or a new
// category that was added. If the id is empty then it's a new category.
function saveCategory() {
  var newName = $('#newCategoryName').val();
  if (!newName) {
    alert('Name is required');
    return;
  }
  var category = {};
  var categoryId = $('#categoryId').val();
  if (categoryId === "") {
    category = {"id": "category-" + createUniqueId(),
                "name": newName,
                "talks": []};
    progData.config.unassigned_talks.push(category);
  } else { // an existing category.
    category = findObj(categoryId, progData);
    if (category === null) {
      console.log('Cannot find that category');
    } else {
      category.name = newName;
    }
  }
  $('#editCategoryBox').modal('hide');
  refresh();
}

// Populate modal for adding or editing a category. If id is empty, then
// it's for adding a new category. Otherwise it is to edit an existing
// category.
function showCategoryEditor(id) {
  $('#deleteCategoryWarning').hide();
  $('#categoryId').val(id);
  $('#deleteCategoryButton').text('Delete the category');
  if (id === "") { // then we're adding a new category
    $('#deleteCategoryButton').hide();
    $('#categoryEditorTitle').text('Add a new category');
    $('#newCategoryName').val('');
  } else {
    $('#deleteCategoryButton').show();
    $('#categoryEditorTitle').text('Edit a category');
    var categoryObj = findObj(id, progData);
    $('#newCategoryName').val(categoryObj.name);
  }
  $('#editCategoryBox').modal();
}

function deleteCategory() {
  if (!$('#deleteCategoryWarning').is(':visible')) {
    $('#deleteCategoryWarning').show();
    $('#deleteCategoryButton').text('Really delete the category');
    return;
  }
  $('#editCategoryBox').modal('hide');
  var categoryId = $('#categoryId').val();
  var categoryIndex = progData.config.unassigned_talks.findIndex(function(el) {
    return el.id === categoryId;
  });
  if (categoryIndex < 0) {
    console.log('unable to find category');
    return;
  }
  var targetCategory = progData.config.unassigned_talks[categoryIndex];
  var uncategorized = findObj('category-0', progData);
  if (uncategorized === null) {
    console.log('unable to find uncategorized');
    return;
  }
  for (var i = 0; i < targetCategory.talks.length; i++) {
    console.log('moving talk ');
    console.dir(targetCategory.talks[i]);
    uncategorized.talks.push(targetCategory.talks[i]);
  }
  progData.config.unassigned_talks.splice(categoryIndex, 1);
  refresh();
}


// Prepopulate edit session modal with relevant fields from parent div of clicked edit button
function editSession(dayIndex, slotIndex, sessionIndex) {
  $('#deleteSessionWarning').hide();
  $('#deleteSessionButton').text('Delete session');
  var sessionObj = progData.days[dayIndex].timeslots[slotIndex].sessions[sessionIndex];
  if (progData.days[dayIndex].timeslots[slotIndex].sessions.length < 2) {
    // Can't delete the only session in a timeslot.
    $('#deleteSessionButton').hide();
    $('#singleSessionInstructions').show();
  } else {
    $('#deleteSessionButton').show();
    $('#singleSessionInstructions').hide();
  }
  $('#currentDayIndex').val(dayIndex);
  $('#currentSlotIndex').val(slotIndex);
  $('#currentSessionIndex').val(sessionIndex);
  $('#currentSessionTitle').val(sessionObj.session_title);

  if(sessionObj.session_url) {
    $('#currentSessionURL').val(sessionObj.session_url);
  } else {
    $('#currentSessionURL').val('');
  }

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

  $('#allowTalks').prop('checked', sessionObj.hasOwnProperty('talks'));
  $('#editSessionBox').modal();
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
    'scrollDefault': '11:30',
    'minTime': '00:00',
    'maxTime': '24:00',
    'showDuration': false,
    'step': 1,
    'timeFormat': 'G:i'
  });
  var getTimeDiv = document.getElementById('timeslotDiv');
  var timeSlotInputs = new Datepair(getTimeDiv);
  $('#addTimeslot').modal();
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
  var defaultTime = timeslot.starttime;
  if (!defaultTime) {
    defaultTime = '11:30';
  }
  $('#timeDiv .time').timepicker({
    'scrollDefault': defaultTime,
    'forceRoundTime': true,
    'minTime': '6:00',
    'maxTime': '24:00',
    'show2400': true,
    'showDuration': false,
    'step': 1,
    'timeFormat': 'G:i'
  });

  var getTimeDiv = document.getElementById('timeDiv');
  var timeSlotInputs = new Datepair(getTimeDiv);
  $('#editTimeslot').modal();
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
      progData.config.unassigned_talks[0].push(session.talks[i]);
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

  var sessionURL = $('#currentSessionURL').val();
  if (sessionURL) {
    sessionObj.session_url = sessionURL;
  } else {
    delete sessionObj.session_url;
  }

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

  var talksAllowed = $('#allowTalks').prop('checked');
  if (talksAllowed) {
    if (!sessionObj.hasOwnProperty('talks')) {
      sessionObj.talks = [];
    }
  } else {
    if (sessionObj.hasOwnProperty('talks')) {
      // move any talks in session to unscheduled & delete talks array
      moveTalksToUnassigned(sessionObj);
      delete sessionObj.talks;
    } else {
      console.dir('no talks array found');
    }
  }

  refresh();
}

// Function to remove dead youtube links if they exist.
function removeNulls() {
  progData.days.forEach(function(day) {
    day.timeslots.forEach(function(timeslot) {
      if (timeslot.hasOwnProperty('sessions')) {
        timeslot.sessions.forEach(function(session) {
          if (session.hasOwnProperty('talks')) {
            session.talks.forEach(function(talk) {
              if (talk.hasOwnProperty('videoUrl') && talk['videoUrl'].endsWith('=null')) {
                delete talk.videoUrl;
              }
              if (talk.hasOwnProperty('youtube') && talk['youtube'] == null) {
                delete talk.youtube;
              }
              if (talk.hasOwnProperty('award') && talk['award'] == null) {
                delete talk.award;
              }
            });
          }
        });
      }
    });
  });
}

// Download edited JSON program
function downloadJSON() {
  if ($('#downloadMenu').hasClass('disabled')) {
    return false;
  }
  removeNulls();
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

function showPDFDownload() {
  if ($('#downloadPDFMenu').hasClass('disabled')) {
    return false;
  }
  $('#downloadPDFModal').modal();
}

function downloadPDF() {
  // This populates the form and submits it. The form targets a new tab.
  var f = document.getElementById('pdfform');
  f.json.value = JSON.stringify(progData);
  window.open('', '_programpdf');
  f.submit();
  $('#downloadPDFModal').modal('hide');
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
  if ($('#importDOIMenu').hasClass('disabled')) {
    return false;
  }
  $('#doiStatus').text('');
  $('#resultList').find('li').remove().end()
  $('.progress').hide();
  $('#doiCloseBtn').removeAttr('disabled');
  $('#doiCloseBtn').html('Cancel');
  $('#doiCloseBtn').removeClass('btn-success');
  $('#doiCloseBtn').addClass('btn-light');
  $('#doiSearchBtn').removeAttr('disabled');
  $('#doiSearchBtn').addClass('btn-success');
  $('#doiSearchBtn').removeClass('btn-light');
  $('#importDOISelection').modal();
}

// Construct the URL to look up a talk in crossref. We use only the
// first author.
function getTalkUrl(talk) {
  var url = "https://api.crossref.org/works?mailto=crossref@iacr.org&rows=20&query.bibliographic=";
  // There is a weird error that if AND in caps occurs in the title, it gets
  // a parse error. See https://gitlab.com/crossref/issues/issues/502
  url += encodeURIComponent(talk.title); // .replace(' AND', ' and'));
  url += '&query.author=' + encodeURIComponent(talk.authors[0]);
  return url;
}

// callback in the success function of a DOI lookup.
// the talk is found in jqXHR because it will be set in
// the beforeSend function.
function matchDOI(data, textStatus, jqXHR) {
  for (var i = 0; i < data.message.items.length; i++) {
    var item = data.message.items[i];
    if (item.hasOwnProperty('title')) {
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
      }
    }
  }
  return false;
}

// This class updates a boostrap progress bar with a given id. It keeps track
// of several counters:
//  successCount (how many were successfully matched to a paper)
//  errorCount (how many lookups failed because of a server error)
//  failureCount (how many matches failed to find an answer (either from a lack of match
//     or a server error)
//
//  It finishes when successCount + failureCount = totalCount
function ProgressMonitor(totalCount) {
  if (totalCount == 0) {
    $('#doiStatus').text('No talks to look up');
  } else {
    $('#doiStatus').text('');
  }
  $('#doiSuccess').css('width', '0%');
  $('#doiFailure').css('width', '0%');
  $('#doiSuccess').prop('aria-valuenow', 0);
  $('#doiFailure').prop('aria-valuenow', 0);
  $('.progress').show();
  this.totalCount = totalCount;
  this.failureCount = 0;
  this.successCount = 0;
  // Errors are different than match failures. This indicates that
  // the ajax request had a failure.
  this.errorCount = 0;
  this.updateWidget = function() {
    var msg = this.successCount + ' found out of ' + this.totalCount;
    var successVal = Math.floor(100 * this.successCount / this.totalCount);
    var failureVal = Math.floor(100 * this.failureCount / this.totalCount);
    $('#doiSuccess').prop('aria-valuenow', successVal);
    $('#doiSuccess').css('width', String(successVal) + '%');
    $('#doiSuccess').html(successVal + '%');
    $('#doiFailure').prop('aria-valuenow', failureVal);
    $('#doiFailure').css('width', String(failureVal) + '%');
    $('#doiFailure').html(failureVal + '%');
    if (this.totalCount == this.failureCount + this.successCount) {
      msg = 'Finished! ' + msg;
      if (this.errorCount) {
        msg = msg + ' (' + this.errorCount + ' had server error(s))';
      }
    }
    $('#doiStatus').text(msg);
  }
  this.reportSuccess = function() {
    this.successCount++;
    this.updateWidget();
  }
  this.reportFailure = function() {
    console.log('failure reported');
    this.failureCount++;
    this.updateWidget();
  }
  this.reportError = function(jqXHR) {
    this.failureCount++;
    this.errorCount++;
    this.updateWidget();
  }
}

// Fire an ajax request for every talk that doesn't already have
// a paperUrl field. This includes unassigned talks as well as
// already scheduled talks.
function findDOIs() {
  $('#doiSearchBtn').attr('disabled', true);
  $('#doiSearchBtn').removeClass('btn-success');
  $('#doiSearchBtn').addClass('btn-light');
  $('#doiCloseBtn').attr('disabled', true);
  var talks = [];
  progData.config.unassigned_talks.forEach(function(category) {
    category.talks.forEach(function(talk) {
      if (!talk.hasOwnProperty('paperUrl') || talk['paperUrl'] === '') {
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
              if (!talk.hasOwnProperty('paperUrl') || talk['paperUrl'] === '') {
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
      error: function(jqXHR, textStatus, errorThrown) {
        // Note that this is not called on off-domain ajax.
        // For this purpose we need to register a global handler
        // for ajax requests.
        console.dir(jqXHR);
        console.log(textStatus);
        console.log(errorThrown);
        progressMonitor.reportError();
      }
    });
  })).always(function() {
    $('#doiCloseBtn').removeAttr('disabled');
    $('#doiCloseBtn').removeClass('btn-light');
    $('#doiCloseBtn').addClass('btn-success');
    $('#doiCloseBtn').html('Close');
    console.log('finished all lookups');
    refresh();
  });;
}

function doLogin() {
  // This send an AJAX POST and receives userid and userName in response
  // if it works.
  var iacrref = $('#iacrref').val();
  var password = $('#password').val();
  $.ajax({
    type: "POST",
    url: "ajax.php",
    data: {'iacrref': iacrref, 'password': password},
    beforeSend: function(jqXHR, settings) {
      console.log('before send');
      $('#login_progress').removeClass('login-alert');
      $('#login_progress').text('Checking...');
      return true;
    },
    dataType: "json",
    success: function(data, textStatus, jqxhr) {
      console.dir(data);
      if (data.hasOwnProperty('username')) {
        $('#login_status').text('Logged in as ' + data['username']);
        $('#login_progress').text('');
        $('#authModal').modal('hide');
        $('#logoutMenu').show();
        $('#loginMenu').hide();
        if ($('#auth-button').is(':visible')) {
          $('#auth-button').hide(500);
          $('#newOrExisting').show(500);
        }
      } else {
        $('#login_progress').addClass('login-alert');
        $('#login_progress').text(data['error']);
      }
    },
    error: function(jqxhr, textStatus, error) {
      $('#login_status').text('An error occurred:' + textStatus);
      console.dir(jqxhr);
      console.dir(error);
    }});
}

function doLogout() {
  // This send an AJAX POST and receives a response containing
  // 'message' but no username.
  $.ajax({
    type: "POST",
    url: "ajax.php",
    data: {'logout': true},
    beforeSend: function(jqXHR, settings) {
      $('#login_status').text('Logging out...');
      return true;
    },
    dataType: "json",
    success: function(data, textStatus, jqxhr) {
      if (data.hasOwnProperty('username')) {
        alert('Log out failed!');
        $('#login_status').text('Logout failed for ' + data['username']);
        return;
      }
      if (data.hasOwnProperty('message')) {
        $('#login_status').text('Logged out');
        $('#logoutMenu').hide();
        $('#loginMenu').show();
        $('#authModal').modal();
      }
    },
    error: function(jqxhr, textStatus, error) {
      //$('#login_status').text(textStatus);
      $('#login_status').text('An error occurred:' + textStatus);
      console.dir(jqxhr);
      console.dir(error);
    }});
}

function checkLogin() {
  $.ajax({
    type: "GET",
    url: "ajax.php",
    success: function(data, textStatus, jqxhr) {
      if (data.hasOwnProperty('username')) {
        $('#login_status').text('Logged in as ' + data['username']);
        $('#authModal').modal('hide');
        $('#loginMenu').hide();
        $('#logoutMenu').show();
        if (progData === undefined) {
          $('#newOrExisting').show(500);
        }
      } else {
        $('#login_status').text(data['error']);
        $('#logoutMenu').hide();
        $('#loginMenu').show();
        $('#auth-button').show(500);
        $('#authModal').modal();
      }
    },
    error: function(jqxhr, textStatus, error) {
      $('#login_status').html(textStatus);
      console.dir(jqxhr);
      console.dir(error);
    }});

}

// NOTE: DEBUG ONLY, remove in production. bypasses other steps so all you have to do is upload talks
// function debugStart() {
//   createNew();
//   getConfig('./json/crypto_config.json');
//   $('#uploadTalks').show(500);
// }

// return dictionary (object) of url parameters. NOTE that this fails on repeat params
function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

// navigates to url without parameters
function navigateToHome() {
  window.location.href = window.location.href.split('?')[0];
}

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
  checkLogin();
  // Make dropdown menus respond to hover.
  $('ul#topNavList li.dropdown').hover(function() {
    $(this).find('.dropdown-menu').stop(true, true).delay(100).fadeIn(100);
  }, function() {
    $(this).find('.dropdown-menu').stop(true, true).delay(100).fadeOut(100);
  });
  $('#topNavList a').on('click', function() {
    $('.dropdown-menu').fadeOut(100);
  });

  // checking for ID in url
  if ('id' in getUrlVars()) {
    getConfig('ajax.php?id=' + getUrlVars()['id'],true);
  }
});
