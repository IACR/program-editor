<?php
// This is from https://github.com/IACR/auth-client-php
include("../auth/auth.php");
include("cred.php");
include("lib.php");
// The schema for the database table is as follows:
// mysql> describe programs;
// +----------+--------------+------+-----+-------------------+----------------+
// | Field    | Type         | Null | Key | Default           | Extra          |
// +----------+--------------+------+-----+-------------------+----------------+
// | id       | int(11)      | NO   | PRI | NULL              | auto_increment |
// | name     | varchar(255) | NO   |     | NULL              |                |
// | userid   | varchar(255) | NO   |     | NULL              |                |
// | username | varchar(255) | NO   |     | NULL              |                |
// | json     | mediumtext   | NO   |     | NULL              |                |
// | ts       | timestamp    | NO   |     | CURRENT_TIMESTAMP |                |
// +----------+--------------+------+-----+-------------------+----------------+
//
// The command to create this table is:
//
// CREATE TABLE programs (id integer NOT NULL AUTO_INCREMENT,
//   name varchar(255) NOT NULL,
//   userid varchar(255) NOT NULL,
//   username varchar(255) NOT NULL,
//   json mediumtext NOT NULL,
//   ts timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   PRIMARY KEY (`id`));
//
// The "name" is something like "Crypto 2017", and need not be unique.
// the userid is the iacrref of the logged in user who created it, and
// the username is the real name of the user. Once a row is created, only
// a user logged in with a given userid can modify the data in the row,
// but other users can read the row and save a copy of it. A user may create
// multiple versions with the same name. When the json is fetched from
// the database, there is an extra field of "database_id" that is populated using
// the id from the row in the database.
//
// Note that this depends on mysql because it used PDO:lastInsertId.
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
// 2. Get the list of stored programs. This is a GET with
//    no parameters.
// 3. Get a specific row. This is a GET with an id parameter. The server
//    makes sure that "database_id" is set from id in the database.
// 4. Save a program. This is a POST with one parameter called json.
//    The name is extracted from the json, and if database_id is present
//    in the json, then this is used to decide which row to update. Note
//    however that if the userid in the database does not match the userid
//    of the person sending the save, then a copy of the saved program will
//    be made. This prevents a user from overwriting the work of another
//    user.
//
// Each of these methods has a function to implement them, and in each
// case they receive a pdo object for a php database connection.


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
  $sql = "SELECT id,userid,username,name,ts from programs ORDER BY ts DESC";
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
  echo json_encode($values, JSON_UNESCAPED_UNICODE);
}

// Return the JSON for a given row. The json stored in the
// database is augmented with the database_id.
function doGetRow($pdo, $id) {
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
  $data = json_decode($row['json'], true);
  if ($data == null) {
    sendError('Unable to retrieve json');
    return;
  }
  $data['database_id'] = $id;
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

function doLogin($userid, $password) {
  // This uses login through the IACR membership database. If
  // the userid and password are correct, then it sets several
  // $_SESSION parameters for userid and username.
  $userInfo = array();
  // This uses the authentication protocol described here:
  // https://github.com/IACR/auth-client-php
  $response = \IACR\Authentication\Client\checkPassword($userid, $password, $userInfo);
  if ($response) {
    $userName = $userInfo['firstname'] . ' ' . $userInfo['lastname'];
    session_unset();
    // session_destroy();
    ini_set('session.gc_maxlifetime', 1000000);
    session_set_cookie_params(0, '/tools', '.iacr.org', True);
    session_start();
    $_SESSION['logged_in'] = True;
    $_SESSION['userid'] = $userid;
    $_SESSION['username'] = $userName;
    session_write_close();
    $data = array('userid' => $userid, 'username' => $userName);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
  } else {
    $_SESSION['logged_in'] = False;
    sendError('Incorrect username or password');
  }
}

// Delete a program. The user must be authenticated in order to perform this.
function doDelete($pdo, $database_id) {
  if (!isset($_SESSION['userid'])) {
    sendError('Unable to delete - user not logged in.');
    return;
  }
  $stmt = $pdo->prepare("DELETE FROM programs WHERE id=:database_id AND userid=:userid");
  $stmt->bindParam(':database_id', $database_id);
  $stmt->bindParam(':userid', $_SESSION['userid']);
  if ($stmt->execute()) {
    if ($stmt->rowCount() == 1) {
      echo '{"response": "row was deleted"}';
    } else {
      sendError('You do not have permission to delete this program.');
    }
  } else {
    sendError('Server error: unable to delete');
  }
  $stmt->closeCursor();
  $stmt = null;
}

header('Content-Type: application/json');
if (isset($_GET['id']) && isset($_GET['iacrref'])) {
  try {
    $pdo = new PDO('mysql:host=localhost;dbname=programs;charset=utf8', 'program_editor', $dbpassword);
    doGetRow($pdo, $_GET['id']);
    $pdo = null;
    return;
  } catch (PDOException $e) {
    sendError('Unable to execute');
    return;
  }
}

// The rest of the code is executed for each request. We first check
// if the user is trying to login and execute that. Next we
// check if the user is already logged in. If so, then we check
// if it's a POST or a GET, and route to the appropriate function.

if ($_POST && isset($_POST['iacrref']) && isset($_POST['password'])) {
 doLogin($_POST['iacrref'], $_POST['password']);
 return;
}

session_start();
if ($_POST && isset($_POST['logout'])) {
  session_unset();
  echo json_encode(array('message' => 'User was logged out'));
  return;
}

if (!isLoggedIn()) {
  sendError('Not logged in');
  return;
}

try {
  $pdo = new PDO('mysql:host=localhost;dbname=programs;charset=utf8', 'program_editor', $dbpassword);
  if ($_POST) {
   if (isset($_POST['json'])) {
     doSave($pdo, $_POST['json']);
   } elseif(isset($_POST['delete'])) {
     doDelete($pdo, $_POST['delete']);
   } else {
     echo '{"error": "missing arguments"}';
   }
 } else { // A GET
   if (isset($_GET['id'])) {
     doGetRow($pdo, $_GET['id']);
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
