/*
  1) define progData (= template)
  2) add name and unassigned talks to progData
  3) submit progData and continue to editor proper
*/

// start with conference name in progData
var progData = {name: document.getElementById('confName').value};

// Returns new integer for use as id on talks and sessions
function createUniqueId() {
  progData.config.uniqueIDIndex++;
  return progData.config.uniqueIDIndex;
}

function updateName() {
  progData.name = document.getElementById('confName').value;
}

// set start/end dates in progData
function setDates(startDate) {
  var day = moment(startDate);
  for (var i = 0; i < progData.days.length; i++) {
    progData.days[i].date = day.format('YYYY-MM-DD');
    day.add(1, 'days');
  }
}

// jQuery date picker
function hotCrpDatePicker(numDays) {
  $('#startEndDatePicker').dateRangePicker( {
    separator : ' to ',
    autoClose: true,
    minDays: numDays,
    maxDays: numDays,
    getValue: function() {
      if ($('#startDate').val() && $('#endDate').val()) {
        return $('#startDate').val() + ' to ' + $('#endDate').val();
      } else {
        return '';
      }
    },
    setValue: function(s,s1,s2) {
      $('#startDate').val(s1);
      $('#endDate').val(s2);
      setDates(s1);
      $('#startEditor').removeAttr('disabled');
    }
  });
}

// Validates that data conforms to progData schema
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

// parse JSON file to create initial program structure
function getConfig(name) {
  $.getJSON(name, function(data) {
    setProgData(data);

    // updates name and add accepted papers
    progData.name = document.getElementById('confName').value;
    progData.config.unassigned_talks = document.getElementById('acceptedPapers').value;

    // add dates to progData and show datepicker
    hotCrpDatePicker(progData.days.length);
    $('#startEndDatePicker').show(500);

    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('startEditor').disabled = true;
  })
    .fail(function(jqxhr, textStatus, error) {
      console.dir(jqxhr);
      warningBox('There was a problem with this conference template. Please try another.');
  });
}
