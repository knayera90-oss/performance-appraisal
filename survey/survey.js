/* ================= CONFIG ================= */
var HR_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbweow5iRnufLQWRBC4Ia0nlSy_r0zAb04DE9ykJhXbMbfy8YcnfyK_f6xY3dADSOrwa/exec";
/* ========================================== */

var SCALE = [
  { v: 1, t: "1 — Very difficult" },
  { v: 2, t: "2 — Difficult" },
  { v: 3, t: "3 — Neutral" },
  { v: 4, t: "4 — Easy" },
  { v: 5, t: "5 — Very easy" }
];

/* Generic 1–5 labels when the question wording differs (overridable per group) */
var GROUP_LABELS = {
  diffSeverity: {
    1: "1 — Minor delay", 2: "2 — Mild slowdown", 3: "3 — Noticeable slowdown", 4: "4 — Major blocker", 5: "5 — Work fully blocked"
  },
  productivity: {
    1: "1 — Much less", 2: "2 — Less", 3: "3 — About the same", 4: "4 — More", 5: "5 — Much more"
  },
  overall: {
    1: "1 — Very poor", 2: "2 — Poor", 3: "3 — Acceptable", 4: "4 — Good", 5: "5 — Excellent"
  }
};

function buildScales() {
  var rows = document.querySelectorAll(".scale-row");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var group = row.getAttribute("data-group");
    var labels = GROUP_LABELS[group] || {};
    for (var k = 1; k <= 5; k++) {
      var txt = labels[k] || (SCALE[k - 1].t);
      var lbl = document.createElement("label");
      lbl.className = "opt";
      lbl.innerHTML = '<input type="radio" name="' + group + '" value="' + k + '"><span>' + txt + "</span>";
      row.appendChild(lbl);
    }
  }
}

function setupMultiChecks() {
  var grids = document.querySelectorAll("[data-multi]");
  for (var i = 0; i < grids.length; i++) {
    (function (grid) {
      var spans = Array.prototype.slice.call(grid.querySelectorAll("span"));
      for (var j = 0; j < spans.length; j++) {
        (function (sp) {
          var v = sp.getAttribute("data-v");
          var lbl = document.createElement("label");
          lbl.className = "opt";
          var inp = document.createElement("input");
          inp.type = "checkbox";
          inp.value = v;
          lbl.appendChild(inp);
          var newSpan = document.createElement("span");
          newSpan.textContent = sp.textContent;
          lbl.appendChild(newSpan);
          sp.parentNode.replaceChild(lbl, sp);
        })(spans[j]);
      }
    })(grids[i]);
  }
}

function getMulti(gridId) {
  var grid = document.getElementById(gridId);
  if (!grid) return [];
  var inputs = grid.querySelectorAll('input[type="checkbox"]');
  var out = [];
  for (var i = 0; i < inputs.length; i++) if (inputs[i].checked) out.push(inputs[i].value);
  return out;
}

function getScale(group) {
  var sel = document.querySelector('input[name="' + group + '"]:checked');
  return sel ? parseInt(sel.value, 10) : null;
}

function showIf(selectId, blockId, triggerValue, extraShowId) {
  var sel = document.getElementById(selectId);
  var blk = document.getElementById(blockId);
  function sync() {
    var on = sel.value === triggerValue;
    blk.style.display = on ? "block" : "none";
    if (extraShowId) {
      var ex = document.getElementById(extraShowId);
      if (ex) ex.style.display = on ? "block" : "none";
    }
  }
  sel.addEventListener("change", sync);
}

function submitSurvey() {
  var dept = document.getElementById("empDept").value;
  var dDate = document.getElementById("wfhDate").value;
  var reachTeam = getScale("reachTeam");
  var reachMe = getScale("reachMe");
  var reachCross = getScale("reachCross");
  var productivity = getScale("productivity");
  var overall = getScale("overall");
  var msg = document.getElementById("statusMsg");

  if (!dept) { alert("Please select your department (Section 1)."); return; }
  if (!dDate) { alert("Please pick the WFH day date (Section 1)."); return; }
  if (!reachTeam || !reachMe || !reachCross) { alert("Please answer all reachability questions in Section 2."); return; }
  if (!productivity || !overall) { alert("Please answer both effectiveness questions in Section 5."); return; }

  var payload = {
    form: "WFH Day Feedback Survey",
    submittedAt: new Date().toISOString(),
    name: document.getElementById("empName").value.trim() || "(anonymous)",
    department: dept,
    wfhDate: dDate,
    wfhCount: document.getElementById("wfhCount").value,
    reachTeam: reachTeam,
    reachMe: reachMe,
    reachCross: reachCross,
    tools: getMulti("toolsGrid").join("; "),
    missedUrgent: document.getElementById("missedUrgent").value,
    didInteract: document.getElementById("didInteract").value,
    diffDepartments: getMulti("diffDeptGrid").join("; "),
    diffSeverity: getScale("diffSeverity") || "",
    diffDetail: document.getElementById("diffDetail").value.trim(),
    hasFlag: document.getElementById("hasFlag").value,
    flagTypes: getMulti("flagTypeGrid").join("; "),
    flagPerson: document.getElementById("flagPerson").value,
    flagDetail: document.getElementById("flagDetail").value.trim(),
    productivity: productivity,
    overall: overall,
    keepWfh: document.getElementById("keepWfh").value,
    workedWell: document.getElementById("workedWell").value.trim(),
    shouldImprove: document.getElementById("shouldImprove").value.trim()
  };

  var btn = document.getElementById("submitBtn");
  btn.disabled = true; btn.textContent = "Submitting…";

  if (!HR_SUBMIT_URL) {
    /* Fallback: download a local copy so responses aren't lost if backend isn't wired yet */
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wfh-survey-response.json";
    a.click();
    msg.style.display = "block"; msg.style.color = "#b45309";
    msg.textContent = "Backend not configured yet — a copy was downloaded. Ask HR to paste your Apps Script URL.";
    btn.disabled = false; btn.textContent = "Submit Survey";
    return;
  }

  fetch(HR_SUBMIT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  }).then(function () {
    msg.style.display = "block"; msg.style.color = "#059669";
    msg.textContent = "Thank you! Your feedback has been submitted to HR.";
    btn.textContent = "Submitted \u2713";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }).catch(function () {
    msg.style.display = "block"; msg.style.color = "#dc2626";
    msg.textContent = "Submission may have failed. Please check your connection and try again, or contact HR.";
    btn.disabled = false; btn.textContent = "Submit Survey";
  });
}

/* init */
buildScales();
setupMultiChecks();
showIf("didInteract", "deptDiffBlock", "Yes");
showIf("hasFlag", "flagBlock", "Yes");
document.getElementById("hasFlag").addEventListener("change", function () {
  document.getElementById("flagAlert").style.display = this.value === "Yes" ? "block" : "none";
});
