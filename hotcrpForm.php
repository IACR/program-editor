<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Security-Policy" content="connect-src 'self' https://api.crossref.org/";default-src: 'self'>
    <meta charset="utf-8">

    <title>Program Editor</title>

    <!-- Bootstrap -->
   <link href="styles/bootstrap.flatly.css" rel="stylesheet" />

    <!-- jQuery daterangepicker -->
    <link href="./dependencies/jquery-daterange-picker/daterangepicker.min.css" rel="stylesheet" />

    <!-- Styling: Custom -->
    <link href="./styles/main.css" rel="stylesheet" />
    <link href="/libs/fonts/raleway-regular.css" rel="stylesheet"/>
    <link href="/libs/fonts/open-sans-condensed.css" rel="stylesheet"/>

    <!-- Page-specific styling -->
    <style>
      #startEndDatePicker {
        display: none;
      }
    </style>
  </head>
  <body>
    <nav class="navbar navbar-expand navbar-custom" id="topNav" role="navigation">
      <span class="navbar-brand" id="navBrand">Program Creator</span>
    </nav>

    <p class="instructions mt-3 text-justify">
      These settings can all be changed later.
    </p>
    <div class="container pt-4">
      <!-- TODO: setting up progData in browser memory then gonna do an AJAX call -->
      <textarea id="acceptedPapers" class="d-none" name="accepted" rows="8" cols="80" readonly>
        <?php echo $_POST['accepted'] ?>
      </textarea>

      <div id="confNameInput" class="form-group row">
        <label for="name" class="col-3 col-form-label">Conference name</label>
        <input id="confName" type="text" class="col-6" name="name" value="<?php echo $_POST['name']; ?>" oninput="updateName()" />
      </div>

      <div class="form-group row">
        <label for="templateSelect" class="col-3 col-form-label">Base conference template</label>
        <select name="templateSelect" class="col-6" onchange="getConfig(this.value)">
          <option value="" disabled selected>
            Please select a template
          </option>
          <option value="./json/crypto_config.json">
            Crypto (5 days, dual track, bbq)
          </option>
          <option value="./json/ec_config.json">
            Eurocrypt/Asiacrypt (5 days, dual track, banquet)
          </option>
          <option value="./json/pkc_config.json">
            CHES/FSE/PKC/TCC (4 days, single track)
          </option>
          <option value="./json/basic_1day.json">
            Basic one-day workshop
          </option>
          <option value="./json/basic_2day.json">
            Basic two-day workshop
          </option>
          <option value="./json/basic_3day.json">
            Basic three-day conference
          </option>
          <option value="./json/dualtrack_5day.json">
            Dual track, five days
          </option>
        </select>
      </div>

      <div id="startEndDatePicker" class="form-group row">
        <label for="startDate" class="col-3 col-form-label">Conference dates</label>
        <input id="startDate" type="text" class="col-3 mr-2" name="startDate" autocomplete="off" placeholder="Start date" /> <label class="col-form-label">to</label> <input id="endDate" type="text" class="col-3 ml-2" name="endDate" autocomplete="off" placeholder="End date" />
      </div>

      <button id="startEditor" class="btn btn-success btn-small" disabled>Start editor</button>
    </div>

    <!-- Bootstrap scripts -->
    <script src="/libs/js/jquery/3.3.1/jquery.min.js"></script>
    <noscript><h1>This tool will not work without javascript.</h1></noscript>
    <script src="/libs/css/bootstrap/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Dependencies (momentJS, jQuery daterange picker, & datepair) -->
    <script src="/libs/js/moment/moment.min.js"></script>
    <script src="./dependencies/jquery-daterange-picker/jquery.daterangepicker.min.js"></script>
    <script src="./dependencies/datepair/jquery.datepair.min.js"></script>

    <!-- Custom scripts -->
    <script src="./scripts/hotCRP.js"></script>
  </body>
</html>
