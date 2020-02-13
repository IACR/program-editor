<?php
  // if start date is missing, assume it came from HotCRP
  if (empty($_POST['startDate'])) {
    include "hotcrpForm.php";
    return;
  }
  
  var_dump($_POST);
?>
