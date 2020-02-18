<?php
// Utility function to send an error message.
function sendError($message, $errorInfo = null) {
  $data = array("error" => $message);
  if ($errorInfo != null) {
    $data['errorInfo'] = $errorInfo;
  }
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

// Save a version. This looks for the database_id field in the json,
// as well as the userid of the request. If there is no database_id
// in the json that is sent, then a new row is created and the response
// contains the id of the new row. If there is a database_id in the
// sent json, then there are three cases:
// 1. the database contains no row with this id, in which case
//    a new row is created.
// 2. the database contains a row with this id and the same userid
//    as sent the request. In this case the row is updated with the
//    json value.
// 3. the database contains a row with this id, but the userid in
//    the database is different. In this case the database will create
//    a new row containing the json and the new userid (with a new id).
// In all three cases, the response is {"database_id": database_id}.
// The "name" field is within the json, and is extracted at the time
// of save and stored in the database. This allows the user to change
// the name of the row.
function doSave($pdo, $json) {
  $name = 'unknown';
  $data = json_decode($json, true);
  if ($data == null) {
    sendError('JSON could not be decoded.');
    return;
  }
  if (isset($data['name'])) {
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
  $database_id = null;
  if (!isset($data['database_id'])) {
    $stmt = $pdo->prepare("INSERT INTO programs (name,userid,username,json) values (:name, :userid, :username, :json)");
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':userid', $userid);
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':json', $json);
    if ($stmt->execute()) {
      $response = array("userid" => $userid, "database_id" => $pdo->lastInsertId());
      echo json_encode($response, JSON_UNESCAPED_UNICODE);
    } else {
      sendError('Server error: unable to save', $stmt->errorInfo());
    }
  } else { // Check that the userid in the database is the same as the authenticated one.
    $database_id = $data['database_id'];
    $sql = "SELECT userid FROM programs where id = :id";
    $stmt2 = $pdo->prepare($sql);
    $stmt2->bindParam(":id", $database_id);
    if (!$stmt2->execute()) {
      $stmt2->closeCursor();
      $stmt2 = null;
      // We should perhaps just do an insert in this case.
      sendError("Server error: unable to locate database row");
      return;
    }
    $row = $stmt2->fetch(PDO::FETCH_ASSOC);
    $stmt2->closeCursor();
    $stmt2 = null;
    if ($row != null && $row['userid'] == $userid) {
      // Then the user already owns the row, so do a replace.
      $stmt = $pdo->prepare("REPLACE INTO programs (id,name,userid,username,json) values (:database_id, :name, :userid, :username, :json)");
      $stmt->bindParam(':database_id', $database_id);
    } else {
      // The user doesn't own the row, so we create a copy with the new userid, and
      // we will get $database_id from the insert.
      $database_id = null;
      $stmt = $pdo->prepare("INSERT INTO programs (name, userid, username, json) values (:name, :userid, :username, :json)");
    }
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':userid', $userid);
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':json', $json);
    if ($stmt->execute()) {
      if ($database_id == null) {
         $database_id = $pdo->lastInsertId();
      }
      $response = array("userid" => $userid, "database_id" => $database_id);
      echo json_encode($response, JSON_UNESCAPED_UNICODE);
    } else {
      sendError("Server error: unable to save data");
    }
  }
  $stmt->closeCursor();
  $stmt = null;
}

// This checks if the php session is active.
function isLoggedIn() {
  return isset($_SESSION['username']);
}
?>
