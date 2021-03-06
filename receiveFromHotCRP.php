<?php
  include "cred.php";
  include "lib.php";

  // if start date is missing, assume it came from HotCRP
  if (isset($_POST['name']) && isset($_POST['accepted'])) {
    include "hotcrpForm.php";
    return;
  }

  header('Content-Type: application/json');

  if(!isset($_POST['progData'])) {
    sendError('missing progData');
    return;
  }

  session_start();
  if (!isLoggedIn()) {
    sendError('Not logged in');
    return;
  }

  try {
    $pdo = new PDO('mysql:host=localhost;dbname=programs;charset=utf8', 'program_editor', $dbpassword);
    doSave($pdo, $_POST['progData']);
    $pdo = null;
  } catch (PDOException $e) {
    sendError('Unable to execute');
    return;
  }
?>
