<?php
include("cred.php");
// The schema for the database table is as follows:
// mysql> describe program;
// +-------+--------------+------+-----+-------------------+----------------+
// | Field | Type         | Null | Key | Default           | Extra          |
// +-------+--------------+------+-----+-------------------+----------------+
// | id    | int(11)      | NO   | PRI | NULL              | auto_increment |
// | name  | varchar(255) | NO   |     | NULL              |                |
// | user  | varchar(255) | NO   |     | NULL              |                |
// | json  | text         | NO   |     | NULL              |                |
// | ts    | timestamp    | NO   |     | CURRENT_TIMESTAMP |                |
// +-------+--------------+------+-----+-------------------+----------------+
//
// The command to create this table is:
//
// CREATE TABLE program (id integer NOT NULL AUTO_INCREMENT,
//   name varchar(255) NOT NULL,
//   user varchar(255) NOT NULL,
//   json text NOT NULL,
//   ts timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   UNIQUE INDEX version(name,user),
//   PRIMARY KEY (`id`));
//
// The "name" is something like "crypto 2017" and all rows for a given value
// represent versions stored for a given name. The user is the username of the
// logged in user who created it.
//
// The ajax protocol supports four kinds of requests, returning a JSON object
// in each case. If an error occurs, it returns an "error" field in the JSON.
// For details on the returned value, see each function below.
//
// 1. get the list of the latest version for each name. This is a GET with
//    no parameters.
// 2. get the list of all versions for a given name. This is a GET with a single
//    parameter of "name".
// 3. get a specific row. This is a GET with an id parameter.
// 4. save a program. This is a POST with one parameter called json.
//    The name is extracted from the json, and at most four versions of
//    each name are kept in the database.
//
// Each of these methods has a function to implement them, and in each
// case they receive a pdo object for a php database connection.

// Utility function to send an error message.
function sendError($message) {
  $data = array("error" => $message);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
}
// Return the list of the latest version for each name. The returned value is JSON of
// the form:
// {"programs":
//   [{"id": 5, "user": "fred", name": "crypto2017", "ts": "2017-06-30 03:21:31"},
//    {"id": 7, "user": "mccurley", "name": "pkc2017", "ts": "2017-05-22 22:19:01"}]
// }
function doGetLatest($pdo) {
  // This selects the latest id, name for each name.
  $sql = "SELECT id,user,name,ts from program";
  $stmt = $pdo->prepare($sql);
  if (!$stmt->execute()) {
    echo '{"error": "Unable to execute sql"}';
    $stmt = null;
    return;
  }
  $values = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $stmt->closeCursor();
  $stmt = null;
  if (!$values) {
    echo '{"error": "Nothing found for that id"}';
    return;
  }
  $values = array("programs" => $values);
  echo json_encode($values);
}

// Return the list of all versions for a given name. The return
// value is the same as the doGetLatest() function.
function doGetVersions($pdo, $name) {
  $sql = "SELECT id,user,name,ts FROM program where name = :name";
  $stmt = $pdo->prepare($sql);
  if (!$stmt) {
    echo '{"error": "unable to prepare statement"}';
    return;
  }
  $stmt->bindParam(':name', $name);
  if (!$stmt->execute()) {
    echo '{"error": "Unable to fetch values"}';
    $stmt->closeCursor();
    $stmt = null;
    return;
  }
  $values = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $stmt->closeCursor();
  $stmt = null;
  if ($values) {
    $values = array("programs" => $values);
    echo json_encode($values);
  } else {
    echo '{"error": "Nothing found by that name"}';
  }
}

// Return the JSON for a given row.
function doGetRow($pdo, $id) {
  $sql = "SELECT user,json FROM program where id = :id";
  $stmt = $pdo->prepare($sql);
  if (!$stmt) {
    echo '{"error": "Unable to prepare select"}';
    return;
  }
  $stmt->bindParam(':id', $id);
  if (!$stmt->execute()) {
    echo '{"error": "Unable to execte doGetRow"}';
    $stmt = null;
    return;
  }
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  $stmt->closeCursor();
  $stmt = null;
  if (!$row) {
    echo '{"error": "no value returned"}';
    return;
  }
  if (!isset($row['json'])) {
    echo '{"error": "no json in database"}';
    return;
  }
  $json = $row['json'];
  // The process of storing them seems to escape single and double quotes.
  // We need to understand this better.
  $json = str_replace('\"', '"', $json);
  $json = str_replace("\\'", "'", $json);
  echo $json;
}


// Save a version. The "name" field is within the json. The return value
// is an empty JSON.
// TODO: restrict it to only store at most n rows for a given value of name.
function doSave($pdo, $json) {
  $name = 'unknown';
  $data = json_decode($json, true);

  if ($data != null && isset($data['name'])) {
    $name = $data['name'];
  }
  $user = 'Unknown';
  if (isset($_SERVER['PHP_AUTH_USER'])) {
    $user = $_SERVER['PHP_AUTH_USER'];
  }
  //  $json = $pdo->quote($json);
  $stmt = $pdo->prepare("REPLACE INTO program (name,user,json) values (:name, :user, :json)");
  $stmt->bindParam(':name', $name);
  $stmt->bindParam(':user', $user);
  $stmt->bindParam(':json', $json);
  if ($stmt->execute()) {
    echo '{}';
  } else {
    sendError('unable to save');
  }
  $stmt->closeCursor();
  $stmt = null;
}

// This is what is executed for each request. We decide if it's a POST
// or a GET, and route to the appropriate function.
header('Content-Type: application/json');
try {
  $pdo = new PDO('mysql:host=localhost;dbname=programs', 'program_editor', $dbpassword);
  if ($_POST) {
   if (isset($_POST['json'])) {
     doSave($pdo, $_POST['json']);
   } else {
     echo '{"error": "missing program"}';
   }
 } else { // A GET
   if (isset($_GET['id'])) {
     doGetRow($pdo, $_GET['id']);
   } else if (isset($_GET['name'])) {
     doGetVersions($pdo, $_GET['name']);
   } else {
     doGetLatest($pdo);
   }
 }
 $pdo = null;
} catch (PDOException $e) {
  // If it can't connect to the database, say why.
  echo '{"error": "' . $e->getMessage() . '"}';
  die();
}
// This appears to tell the PHP engine to free the mysql connection.
$pdo = null;
?>
