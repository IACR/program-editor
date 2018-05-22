<?php

require_once __DIR__ . '/vendor/autoload.php';

function join_authors(&$data) {
  foreach ($data['days'] as &$day) {
    foreach ($day['timeslots'] as &$timeslot) {
      foreach ($timeslot['sessions'] as &$session) {
        if (isset($session['talks'])) {
          foreach ($session['talks'] as &$talk) {
            $newauthors = implode(", ", $talk['authors']);
            $talk['authors'] = $newauthors;
          }
        }
      }
    }
  }
}

function deDupAffiliations(&$data) {
  foreach ($data['days'] as &$day) {
    foreach ($day['timeslots'] as &$timeslot) {
      foreach ($timeslot['sessions'] as &$session) {
        if (isset($session['talks'])) {
          foreach ($session['talks'] as &$talk) {
            $talk['affiliations'] = implode(", ", array_unique(array_map("trim", explode(";", $talk['affiliations']))));
          }
        }
      }
    }
  }
}

function countSessions(&$data) {
  foreach ($data['days'] as &$day) {
    $day['date'] = strftime('%A, %B %d, %Y', strtotime($day['date']));
    $maxSessions = 1;
    foreach ($day['timeslots'] as &$timeslot) {
      if (count($timeslot['sessions']) > 1) {
         $timeslot['twosessions'] = 1;
         $maxSessions = max($maxSessions, count($timeslot['sessions']));
      } else {
         $timeslot['onesession'] = 1;
      }
    }
  }
  return $maxSessions;
}

if (isset($_POST['json'])) {
  $datastr = $_POST['json'];
} else {
  die('Missing json for program');
}
//echo $datastr;
$data = json_decode($datastr, true);
//$data["json"] = $datastr;
join_authors($data);
deDupAffiliations($data);
$maxSessions = countSessions($data);
//print_r($data);
$page_format = 'Letter';
if (isset($_POST['page_format'])) {
  $accepted_formats = array('A4', 'A4-L', 'Letter', 'Letter-L', 'A0', 'A1', 'A2', 'A3', 'Legal', 'Tabloid');
  if (in_array($_POST['page_format'], $accepted_formats)) {
    $page_format = $_POST['page_format'];
  }
}
$loader = new Twig_Loader_Filesystem(__DIR__.'/templates');
$twig = new Twig_Environment($loader);
$html = $twig->render('program.tpl', $data);
if (isset($_POST['page_format']) && $_POST['page_format']=='HTML') {
  echo $html;
} else {
  $mpdf = new \Mpdf\Mpdf(['mode' => 'utf-8',
    'format' => $page_format]);
  $mpdf->SetFooter('{PAGENO}');
  if (isset($_POST['two_column']) && ($maxSessions < 2 || substr($page_format, -1) == 'S')) {
    $mpdf->SetColumns(2);
    $mpdf->shrink_tables_to_fit = 2.0;
  }
  $mpdf->WriteHTML($html, 0, true, true);
  $mpdf->Output('program.pdf', \Mpdf\Output\Destination::INLINE);
}
?>
