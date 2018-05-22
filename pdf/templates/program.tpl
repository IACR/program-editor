<html>
<head>
<style type="text/css">
table {
  border-collapse: collapse;
}
table.day {
  margin-bottom: 5px;
  width: 100%;
}
tr.date {
  background-color: #c0c0ff;
  border: 1px solid black;
}
tr.timeslot {
  page-break-inside: avoid;
}
table.session {
  page-break-inside: avoid;
  border-collapse: hidden;
}
span.session_title {
  font-weight:bold;
  font-size: medium;
  font-family: sans-serif;
}
span.title {
  font-weight: bold;
  font-size: small;
}
span.authors {
  font-size: x-small;
}
span.affiliations {
  font-size: x-small;
  font-style: italic;
}
span.moderator {
  font-size: x-small;
}
span.location {
  font-size: x-small;
}
span.date {
  font-size: large;
}
td.time {
  text-align: left;
  vertical-align: middle;
  border: 1px solid black;
}
span.time {
  font-size: small;
  font-weight: bold;
}
td.centered {
  text-align: center;
}
tr.timeslot {
  border: 1px solid black;
}
td.twosessions {
  vertical-align: top;
}
td.time {
  text-align: center;
}
</style>
</head>
<body>
  <h1 align="center">{{name}} Program</h1>
  {% for day in days %}
  <table class="day" cellpadding="2">
    <thead>
      <tr class="date">
	<td colspan="3" align="left"><span class="date">{{ day.date }}</span></td>
      </tr>
    </thead>
    <tbody>
      {% for timeslot in day.timeslots %}
      <tr class="timeslot">
	<td align="center" class="time"><span class="time">{{timeslot.starttime}}&ndash;{{timeslot.endtime}}</span></td>
	{% if timeslot.twosessions %}
	{% for session in timeslot.sessions %}
        <td class="twosessions">
	  <table class="session"><tbody>
              <tr><td><span class="session_title">{{session.session_title}}</span>
		  {% if session.location.name %}<br><span class="moderator">Location: {{session.location.name}}</span>{% endif %}
                  {% if session.moderator %}<br><span class="moderator">Chair: {{session.moderator}}</span>{% endif %}</td></tr>
             {% for talk in session.talks %}
              <tr><td>
		  <span class="title">
		    {% if talk.paperUrl %}<a href="{{talk.paperUrl}}">{% endif %}{{talk.title}}{% if talk.paperUrl %}</a>{% endif %}
		  </span><br>
		  <span class="authors">{{talk.authors}}</span><br>
		  <span class="affiliations">{{talk.affiliations}}</span>
	      </td></tr>
              {% endfor %}
          </tbody></table>
	</td>
       {% endfor %}
     {% else %}
	<td class="onesession" colspan="2" align="center">
	  <table class="session">
	    <tbody>{% for session in timeslot.sessions %}
              <tr>
		<td align="center">
		  <span class="session_title">{{session.session_title}}</span>
		  {% if session.location.name %}<br><span class="location">Location: {{session.location.name}}</span>{% endif %}
		  {% if session.moderator %}<br><span class="moderator centered">Chair: {{session.moderator}}</span>{% endif %}
		</td>
	      </tr>
              {% if session.talks %}
	      {% for talk in session.talks %}
	      <tr><td align="center">
		  <span class="title">{% if talk.paperUrl %}<a href="{{talk.paperUrl}}">{% endif %}{{talk.title}}{% if talk.paperUrl %}</a>{% endif %}</span><br>
		  <span class="authors centered">{{talk.authors}}</span><br>
		  <span class="affiliations centered">{{talk.affiliations}}</span>
	      </td></tr>
         {% endfor %}{% endif %}
         {% endfor %}
           </tbody>
        </table>
       </td>
     {% endif %}
   </tr>
  {% endfor %}
</tbody>
</table>
{% endfor %}
</body>
</html>
