// === Adjustable Variables ===
const predictableTime = 4900;
const semiPredictableTimes = [1700, 4900];
const unpredictableRange = [1700, 4900];
const trialsPerCondition = 20;
const intertrialIntervalRange = [2100];
// ============================

let results = []; // Store all trial data
let barWidth, startTime, targetTime;
let conditions = ["predictable", "semi-predictable", "unpredictable"];
let currentConditionIndex = 0;
let trialCounter = 0;
let semiPredCount = {};
semiPredictableTimes.forEach(t => semiPredCount[t] = 0);

let trialRunning = false;
let intertrialStart = 0;
let currentITI = 0;
let barTurnedRed = false;

// Generate or grab participant ID from URL
const urlParams = new URLSearchParams(window.location.search);
let participantID = urlParams.get('pid') || generateParticipantID();

function generateParticipantID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function setup() {
  const canvasWidth = windowWidth * 0.8;
  const canvasHeight = windowHeight * 0.2;
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-container");
  startIntertrialInterval();
}

function windowResized() {
  resizeCanvas(windowWidth * 0.8, windowHeight * 0.2);
}

function draw() {
  background(0);
  if (trialRunning) runTrial();
  else runIntertrialInterval();
}

function runTrial() {
  let elapsed = millis() - startTime;

  if (currentCondition() === "unpredictable") {
    fill(barTurnedRed ? 'red' : 255);
    rect(50, 60, width - 100, 30);
    if (!barTurnedRed && elapsed >= targetTime) {
      barTurnedRed = true;
    }
  } else {
    barWidth = map(elapsed, 0, unpredictableRange[1], 0, width - 100);
    fill(elapsed >= targetTime ? 'red' : 255);
    rect(50, 60, barWidth, 30);
    stroke(0);
    if (currentCondition() === "predictable") {
      drawMarkerAt(predictableTime);
    } else if (currentCondition() === "semi-predictable") {
      semiPredictableTimes.forEach(t => drawMarkerAt(t));
    }
  }

  if (elapsed > unpredictableRange[1] + 500) endTrial("No response");
}

function drawMarkerAt(timeMs) {
  let x = map(timeMs, 0, unpredictableRange[1], 50, width - 50);
  line(x, 50, x, 100);
}

function keyPressed() {
  if (key === ' ' && trialRunning) {
    let reactionTime = millis() - (startTime + targetTime);
    console.log(`Condition: ${currentCondition()}, RT: ${reactionTime.toFixed(0)} ms`);
    endTrial(reactionTime);
  }
}

function startTrial() {
  trialRunning = true;
  barTurnedRed = false;
  startTime = millis();

  if (currentCondition() === "predictable") {
    targetTime = predictableTime;
  } else if (currentCondition() === "semi-predictable") {
    targetTime = chooseSemiPredictableTime();
  } else {
    targetTime = random(...unpredictableRange);
  }

  console.log(`Trial ${trialCounter + 1} (${currentCondition()}): Red at ${targetTime} ms`);
}

function endTrial(rt) {
  trialRunning = false;

    const rtVal = typeof rt === "number" ? Number(rt) : null;

  const entry = {
    condition: currentCondition(),
    targetTime: targetTime,
    reactionTime: rtVal,
  };

  sendDataToGoogleSheet(entry);

  results.push({
    ...entry,
    reactionTime: rtVal !== null ? rtVal.toFixed(0) : "No response"
  });

  console.log(`Trial ended. RT: ${rt}`);
  startIntertrialInterval();
}

function startIntertrialInterval() {
  currentITI = random(...intertrialIntervalRange);
  intertrialStart = millis();
}

function runIntertrialInterval() {
  if (millis() - intertrialStart >= currentITI) nextTrial();
}

function currentCondition() {
  return conditions[currentConditionIndex];
}

function chooseSemiPredictableTime() {
  let halfTrials = trialsPerCondition / semiPredictableTimes.length;
  let availableTimes = semiPredictableTimes.filter(t => semiPredCount[t] < halfTrials);
  let chosen = random(availableTimes);
  semiPredCount[chosen]++;
  return chosen;
}

function nextTrial() {
  trialCounter++;
  if (trialCounter >= trialsPerCondition) {
    trialCounter = 0;
    currentConditionIndex++;
    semiPredictableTimes.forEach(t => semiPredCount[t] = 0);
    if (currentConditionIndex >= conditions.length) {
      noLoop();
      console.log("All trials complete!");
      showEndScreen();
      return;
    }
  }
  startTrial();
}

function downloadResultsAsCSV() {
  let csv = "Condition,TargetTime(ms),ReactionTime(ms)\n";
  results.forEach(r => {
    csv += `${r.condition},${r.targetTime},${r.reactionTime}\n`;
  });

  let blob = new Blob([csv], { type: 'text/csv' });
  let url = URL.createObjectURL(blob);
  let a = createA(url, 'download_results.csv');
  a.attribute('download', 'results.csv');
  a.hide();
  a.elt.click();
}

function sendDataToGoogleSheet(entry) {
  fetch("https://script.google.com/macros/s/AKfycbzY9jacf4Xej2NPV0dYIbxGno9LZGN_trMoPpNFQnn1kNZGMFhVvi7NTKCh5PnUvm-g/exec", {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      participantID: participantID,
      ...entry
    })
  })
  .then(() => console.log("Data sent to Google Sheet"))
  .catch(err => console.error("Error sending data:", err));
}
function showEndScreen() {
  background(220);
  textAlign(CENTER, CENTER);
  textSize(24);
  fill(255); // white text
  text("Experiment over.\nThank you for participating!", width / 2, height / 2);
}