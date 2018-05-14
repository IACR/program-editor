<?php
include("../common/auth.php");
include("cred.php");
// The schema for the database table is as follows:
// mysql> describe programs;
// +----------+--------------+------+-----+-------------------+----------------+
// | Field    | Type         | Null | Key | Default           | Extra          |
// +----------+--------------+------+-----+-------------------+----------------+
// | id       | int(11)      | NO   | PRI | NULL              | auto_increment |
// | name     | varchar(255) | NO   |     | NULL              |                |
// | userid   | varchar(255) | NO   |     | NULL              |                |
// | username | varchar(255) | NO   |     | NULL              |                |
// | json     | text         | NO   |     | NULL              |                |
// | ts       | timestamp    | NO   |     | CURRENT_TIMESTAMP |                |
// +----------+--------------+------+-----+-------------------+----------------+
//
// The command to create this table is:
//
// CREATE TABLE programs (id integer NOT NULL AUTO_INCREMENT,
//   name varchar(255) NOT NULL,
//   userid varchar(255) NOT NULL,
//   username varchar(255) NOT NULL,
//   json text NOT NULL,
//   ts timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   UNIQUE INDEX version(name,userid),
//   PRIMARY KEY (`id`));
//
// The "name" is something like "Crypto 2017", and the userid is the iacrref of
// the logged in user who created it, and the username is the real name of the user.
// There is no version history stored for a given value of "name", but different
// users may have their own version for a given name.
//
// The ajax protocol supports four kinds of requests, returning a JSON object
// in each case. If an error occurs, it returns an "error" field in the JSON.
// Successful ajax requests will also include the "username" field
// to show the user who they are logged in as. If this is missing, then
// this means the user is not logged in.  If the user is logged in, then
// the server sets a cookie with two PHP session variables, namely
// $_SESSION['userid'] and $_SESSION['username'].
// For details on the returned value, see each function below.
//
// 1. Login to the app. This is a POST request with two parameters,
//    namely iacrref and password.
// 2. get the list of the latest version for each name. This is a GET with
//    no parameters.
// 3. get the list of all versions for a given name. This is a GET with a single
//    parameter of "name".
// 4. get a specific row. This is a GET with an id parameter.
// 5. save a program. This is a POST with one parameter called json.
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
//   [{"id": 5,
//     "userid": "918012",
//     "username": "Alan Turing",
//     "name": "crypto2017",
//     "ts": "2017-06-30 03:21:31"},
//    {"id": 7,
//     "userid": "460001",
//     "username": "Claude Shannon",
//     "name": "pkc2017",
//     "ts": "2017-05-22 22:19:01"}]
// }
function doGetLatest($pdo) {
  // This selects the latest id, name for each name.
  $sql = "SELECT id,userid,username,name,ts from programs";
  $pdo->query('SET NAMES UTF8');
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
    $values = array();;
  }
  $values = array("programs" => $values, "username" => $_SESSION["username"]);
  echo json_encode($values);
}

// Return the list of all versions for a given name. The return
// value is the same as the doGetLatest() function.
function doGetVersions($pdo, $name) {
  $sql = "SELECT id,username,name,ts FROM programs where name = :name";
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
    $values = array("programs" => $values, "username" => $_SESSION["username"]);
    echo json_encode($values);
  } else {
    echo '{"error": "Nothing found by that name"}';
  }
}

// Return the JSON for a given row.
function doGetRow($pdo, $id) {
  $pdo->query('SET NAMES UTF8');
  $sql = "SELECT userid,json FROM programs where id = :id";
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
  echo $json;
}

function doLogin($userid, $password) {
  // This uses login through the IACR membership database. If
  // the userid and password are correct, then it sets several
  // $_SESSION parameters for userid and username.
  $userName = checkPassword($userid, $password);
  if ($userName) {
    session_unset();
    session_destroy();
    ini_set('session.gc_maxlifetime', 1000000);
    session_set_cookie_params(0, '/tools', '.iacr.org', True);
    session_start();
    $_SESSION['logged_in'] = True;
    $_SESSION['userid'] = $userid;
    $_SESSION['username'] = $userName;
    session_write_close();
    $data = array('userid' => $userid, 'username' => $userName);
    echo json_encode($data);
  } else {
    $_SESSION['logged_in'] = False;
    sendError('Incorrect username or password');
  }
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
  $userid = 'Unknown';
  $username = 'Unknown';
  if (isset($_SESSION['userid'])) {
    $userid = $_SESSION['userid'];
    $username = $_SESSION['username'];
  } else if (isset($_SERVER['PHP_AUTH_USER'])) {
    $userid = $_SERVER['PHP_AUTH_USER'];
    $username = $_SERVER['PHP_AUTH_USER'];
  }
  $pdo->query('SET NAMES UTF8');
  //  $json = $pdo->quote($json);
  $stmt = $pdo->prepare("REPLACE INTO programs (name,userid,username,json) values (:name, :userid, :username, :json)");
  $stmt->bindParam(':name', $name);
  $stmt->bindParam(':userid', $userid);
  $stmt->bindParam(':username', $username);
  $stmt->bindParam(':json', $json);
  if ($stmt->execute()) {
    echo '{}';
  } else {
    sendError('unable to save');
  }
  $stmt->closeCursor();
  $stmt = null;
}

// This checks if the php session is active.
function isLoggedIn() {
  return isset($_SESSION['username']);
}

// The rest of the code is executed for each request. We first check
// if the user is trying to login and execute that. Next we
// check if the user is already logged in. If so, then we check
// if it's a POST or a GET, and route to the appropriate function.

header('Content-Type: application/json');
if ($_POST && isset($_POST['iacrref']) && isset($_POST['password'])) {
 doLogin($_POST['iacrref'], $_POST['password']);
 return;
}

session_start();
if ($_POST && isset($_POST['logout'])) {
  session_destroy();
  echo json_encode(array('message' => 'User was logged out'));
  return;
}

if (!isLoggedIn()) {
  sendError('Not logged in');
  return;
} 

try {
  $pdo = new PDO('mysql:host=localhost;dbname=programs', 'program_editor', $dbpassword);
  if ($_POST) {
   if (isset($_POST['json'])) {
     doSave($pdo, $_POST['json']);
   } else {
     echo '{"error": "missing arguments"}';
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
