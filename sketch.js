// CYANOTYPE CAMERA — SUPABASE ARCHIVE VERSION

const SUPABASE_URL = "https://diucjrosczolxsyxyufm.supabase.co";
const SUPABASE_KEY = "sb_publishable_07b9tiSnGQE1deWh2kbtKA_JZmwauAj";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let cam;
let printLayer;
let textureLayer;
let toolbar;
let bottomBar;
let topRightBar;

let archiveOverlay;
let archiveOverlayInner;
let archiveFrame;
let archiveCloseButton;
let isArchiveOpen = false;

const ARCHIVE_TRANSITION_MS = 260;

let submitOverlay;
let submitOverlayInner;
let submitTitleInput;
let submitAuthorInput;
let submitConfirmButton;
let submitCancelButton;
let isSubmitOpen = false;
let previousBodyOverflow = "";

let lastBottomBarLeft = null;
let lastToolbarLeft = null;
let lastToolbarWidth = null;

let exposureMap = [];

let filmW = 480;
let filmH = 600; // 4:5 portrait

let facingMode = "user";
let mirrorCamera = true;

let baseExposeSpeed = 0.02;
let exposeSpeed = 0.02;

let uvIndex = 4;
let uvText = "finding sun exposure...";

let exposing = false;
let hasStartedExposure = false;

let exposeButton;
let saveButton;
let resetButton;
let flipButton;
let uploadButton;
let archiveButton;

function setup() {
  createCanvas(windowWidth, windowHeight);

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  pixelDensity(1);
  smooth();

  setupCamera();

  printLayer = createGraphics(filmW, filmH);
  printLayer.pixelDensity(1);

  textureLayer = createGraphics(width, height);
  textureLayer.pixelDensity(1);
  makePaperTexture();

  exposureMap = new Array(filmW * filmH).fill(0);

  toolbar = createDiv();
  toolbar.position(12, 12);
  toolbar.style("display", "flex");
  toolbar.style("gap", "8px");
  toolbar.style("flex-wrap", "wrap");
  toolbar.style("z-index", "10");

  topRightBar = createDiv();
  topRightBar.style("position", "fixed");
  topRightBar.style("top", "12px");
  topRightBar.style("right", "12px");
  topRightBar.style("z-index", "10");

  bottomBar = createDiv();
  bottomBar.style("position", "fixed");
  bottomBar.style("left", "0px");
  bottomBar.style("bottom", "72px");
  bottomBar.style("transform", "none");
  bottomBar.style("z-index", "10");
  bottomBar.style("display", "flex");
  bottomBar.style("gap", "8px");

  flipButton = createButton("flip camera");
  flipButton.parent(toolbar);
  flipButton.mousePressed(flipCamera);
  if (!isMobileDevice()) {
    flipButton.hide();
  }

  archiveButton = createButton("archive");
  archiveButton.parent(topRightBar);
  archiveButton.mousePressed(openArchiveOverlay);

  archiveOverlay = createDiv();
  archiveOverlay.style("position", "fixed");
  archiveOverlay.style("inset", "0");
  archiveOverlay.style("z-index", "100");
  archiveOverlay.style("background", "rgba(255, 255, 255, 0.92)");
  archiveOverlay.style("padding", isMobileDevice() ? "12px" : "24px");
  archiveOverlay.style("box-sizing", "border-box");
  archiveOverlay.style("overflow", "hidden");
  archiveOverlay.style("opacity", "0");
  archiveOverlay.style("pointer-events", "none");
  archiveOverlay.style("transition", `opacity ${ARCHIVE_TRANSITION_MS}ms ease`);
  archiveOverlay.style("will-change", "opacity");

  archiveOverlayInner = createDiv();
  archiveOverlayInner.parent(archiveOverlay);
  archiveOverlayInner.style("width", "100%");
  archiveOverlayInner.style("height", "100%");
  archiveOverlayInner.style("display", "grid");
  archiveOverlayInner.style("grid-template-rows", "auto 1fr");
  archiveOverlayInner.style("gap", "12px");
  archiveOverlayInner.style("filter", "blur(12px)");
  archiveOverlayInner.style(
    "transition",
    `filter ${ARCHIVE_TRANSITION_MS}ms ease`
  );
  archiveOverlayInner.style("will-change", "filter");

  const archiveOverlayTop = createDiv();
  archiveOverlayTop.parent(archiveOverlayInner);
  archiveOverlayTop.style("display", "flex");
  archiveOverlayTop.style("justify-content", "flex-end");

  archiveCloseButton = createButton("close");
  archiveCloseButton.parent(archiveOverlayTop);
  archiveCloseButton.mousePressed(closeArchiveOverlay);

  archiveFrame = createElement("iframe");
  archiveFrame.parent(archiveOverlayInner);
  archiveFrame.attribute("title", "Sun Machine Archive");
  archiveFrame.style("width", "100%");
  archiveFrame.style("height", "100%");
  archiveFrame.style("border", isMobileDevice() ? "0" : "1px solid #0033aa");
  archiveFrame.style("background", "white");

  archiveOverlay.elt.addEventListener("click", (e) => {
    if (e.target === archiveOverlay.elt) {
      closeArchiveOverlay();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!isArchiveOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeArchiveOverlay();
    }
  });

  exposeButton = createButton("○ start");
  exposeButton.parent(bottomBar);
  exposeButton.mousePressed(toggleExposure);

  resetButton = createButton("new");
  resetButton.parent(bottomBar);
  resetButton.mousePressed(resetExposure);
  resetButton.hide();

  saveButton = createButton("download");
  saveButton.parent(bottomBar);
  saveButton.mousePressed(downloadPrint);
  saveButton.hide();

  uploadButton = createButton("submit");
  uploadButton.parent(bottomBar);
  uploadButton.mousePressed(uploadToArchive);
  uploadButton.hide();

  styleButtons();

  getSunExposure();
}

function openArchiveOverlay() {
  isArchiveOpen = true;
  archiveFrame.attribute("src", "archive.html");

  archiveOverlay.style("pointer-events", "auto");
  archiveOverlay.style("opacity", "1");
  archiveOverlayInner.style("filter", "blur(0px)");

  setTimeout(() => {
    if (isArchiveOpen) archiveCloseButton.elt.focus();
  }, ARCHIVE_TRANSITION_MS);
}

function closeArchiveOverlay() {
  isArchiveOpen = false;

  archiveOverlay.style("opacity", "0");
  archiveOverlay.style("pointer-events", "none");
  archiveOverlayInner.style("filter", "blur(12px)");

  setTimeout(() => {
    if (!isArchiveOpen) {
      archiveFrame.attribute("src", "about:blank");
    }
  }, ARCHIVE_TRANSITION_MS);
}

function updateSubmitVisibility() {
  if (hasStartedExposure) {
    uploadButton.show();
    saveButton.show();
    resetButton.show();
  } else {
    uploadButton.hide();
    saveButton.hide();
    resetButton.hide();
  }
}

function setupCamera() {
  if (cam) cam.remove();

  let constraints = {
    video: {
      facingMode: facingMode,
      width: { ideal: 1080 },
      height: { ideal: 1350 }
    },
    audio: false
  };

  cam = createCapture(constraints);
  cam.hide();

  mirrorCamera = facingMode === "user";
}

function draw() {
  background(255);

  if (!cam || !cam.loadedmetadata) {
    drawInfo();
    return;
  }

  cam.loadPixels();

  if (cam.pixels.length === 0) {
    drawInfo();
    return;
  }

  if (exposing) {
    accumulateExposure();
  }

  renderPrint();
  drawPrintToCanvas();

  blendMode(MULTIPLY);
  image(textureLayer, 0, 0);
  blendMode(BLEND);

  drawFineBlueSpeckles();
  drawInfo();
}

function accumulateExposure() {
  for (let y = 0; y < filmH; y++) {
    for (let x = 0; x < filmW; x++) {
      let idx = x + y * filmW;
      let sample = getCameraPixelCover(x, y);

      let luma =
        sample.r * 0.299 +
        sample.g * 0.587 +
        sample.b * 0.114;

      let light = luma / 255;
      light = smoothstep(0.18, 0.88, light);

      let shadow = 1.0 - light;
      shadow = pow(shadow, 1.3);

      exposureMap[idx] += shadow * exposeSpeed;
      exposureMap[idx] = constrain(exposureMap[idx], 0, 1);
    }
  }
}

function getCameraPixelCover(x, y) {
  let vw = cam.width;
  let vh = cam.height;

  let sourceRatio = vw / vh;
  let targetRatio = filmW / filmH;

  let cropW, cropH, cropX, cropY;

  if (sourceRatio > targetRatio) {
    cropH = vh;
    cropW = vh * targetRatio;
    cropX = (vw - cropW) * 0.5;
    cropY = 0;
  } else {
    cropW = vw;
    cropH = vw / targetRatio;
    cropX = 0;
    cropY = (vh - cropH) * 0.5;
  }

  let u = x / filmW;
  let v = y / filmH;

  if (mirrorCamera) u = 1.0 - u;

  let sx = floor(cropX + u * cropW);
  let sy = floor(cropY + v * cropH);

  sx = constrain(sx, 0, vw - 1);
  sy = constrain(sy, 0, vh - 1);

  let i = (sx + sy * vw) * 4;

  return {
    r: cam.pixels[i],
    g: cam.pixels[i + 1],
    b: cam.pixels[i + 2]
  };
}

function renderPrint() {
  printLayer.loadPixels();

  for (let y = 0; y < filmH; y++) {
    for (let x = 0; x < filmW; x++) {
      let idx = x + y * filmW;
      let i = idx * 4;

      let e = exposureMap[idx];
      let ink = pow(e, 0.62);

      let paperR = 255;
      let paperG = 255;
      let paperB = 255;

      let blueR = 0;
      let blueG = 70;
      let blueB = 255;

      let deepR = 0;
      let deepG = 12;
      let deepB = 145;

      let targetR = lerp(blueR, deepR, ink);
      let targetG = lerp(blueG, deepG, ink);
      let targetB = lerp(blueB, deepB, ink);

      let finalR = lerp(paperR, targetR, ink);
      let finalG = lerp(paperG, targetG, ink);
      let finalB = lerp(paperB, targetB, ink);

      let n1 = noise(x * 0.045, y * 0.045);
      let n2 = noise(x * 0.22, y * 0.22);
      let texture = (n1 - 0.5) * 18 + (n2 - 0.5) * 10;

      finalR += texture * 0.12;
      finalG += texture * 0.22;
      finalB += texture * 0.5;

      let d = min(x, y, filmW - 1 - x, filmH - 1 - y);
      let edgeFade = smoothstep(0, 10, d);

      finalR = lerp(paperR, finalR, edgeFade);
      finalG = lerp(paperG, finalG, edgeFade);
      finalB = lerp(paperB, finalB, edgeFade);

      printLayer.pixels[i] = constrain(finalR, 0, 255);
      printLayer.pixels[i + 1] = constrain(finalG, 0, 255);
      printLayer.pixels[i + 2] = constrain(finalB, 0, 255);
      printLayer.pixels[i + 3] = 255;
    }
  }

  printLayer.updatePixels();

  let blurAmount = isMobileDevice() ? 0 : 0.2;

  if (blurAmount > 0) {
    printLayer.filter(BLUR, blurAmount);
  }
}

function drawPrintToCanvas() {
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  let topSafe = 90;
  let bottomSafe = 150;

  let availableW = width * 0.92;
  let availableH = height - topSafe - bottomSafe;

  let w = availableW;
  let h = w * 5 / 4;

  if (h > availableH) {
    h = availableH;
    w = h * 4 / 5;
  }

  let x = (width - w) * 0.5;
  let y = topSafe + (availableH - h) * 0.5;

  image(printLayer, x, y, w, h);

  updateToolbarAlignment(x, y, w, h);
  updateBottomBarAlignment(x, y, w, h);

  noFill();
  stroke("#0033aa");
  strokeWeight(1);
  drawCornerFrame(x, y, w, h);
}

function updateToolbarAlignment(frameX, frameY, frameW, frameH) {
  const left = Math.round(frameX);
  const w = Math.round(frameW);

  if (lastToolbarLeft !== left) {
    toolbar.position(left, 12);
    lastToolbarLeft = left;
  }

  if (lastToolbarWidth !== w) {
    toolbar.style("width", `${w}px`);
    lastToolbarWidth = w;
  }
}

function updateBottomBarAlignment(frameX, frameY, frameW, frameH) {
  const left = Math.round(frameX);

  if (lastBottomBarLeft !== left) {
    bottomBar.style("left", `${left}px`);
    lastBottomBarLeft = left;
  }
}

function drawCornerFrame(x, y, w, h) {
  const cornerMax = 18;
  const corner = min(cornerMax, w * 0.12, h * 0.12);

  // top-left
  line(x, y, x + corner, y);
  line(x, y, x, y + corner);

  // top-right
  line(x + w, y, x + w - corner, y);
  line(x + w, y, x + w, y + corner);

  // bottom-left
  line(x, y + h, x + corner, y + h);
  line(x, y + h, x, y + h - corner);

  // bottom-right
  line(x + w, y + h, x + w - corner, y + h);
  line(x + w, y + h, x + w, y + h - corner);
}

function toggleExposure() {
  exposing = !exposing;
  exposeButton.html(exposing ? "● pause" : "○ start");

  if (exposing) {
    hasStartedExposure = true;
  }

  updateSubmitVisibility();
}

function resetExposure() {
  exposureMap = new Array(filmW * filmH).fill(0);

  exposing = false;
  hasStartedExposure = false;
  exposeButton.html("○ start");
  updateSubmitVisibility();
}

function flipCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  setupCamera();
}

function downloadPrint() {
  let scale = 3;

  let exportW = filmW * scale;
  let exportH = filmH * scale;

  let exportLayer = createGraphics(exportW, exportH);
  exportLayer.pixelDensity(1);
  exportLayer.background(255);

  exportLayer.image(printLayer, 0, 0, exportW, exportH);

  exportLayer.save("sun-machine.png");
}

async function uploadToArchive() {
  uploadButton.html("uploading...");

  let title = prompt("Name/title (optional — leave blank)");
  if (title === null) {
    uploadButton.html("submit");
    return;
  }

  title = String(title).trim();

  let author = prompt("Your name (optional — leave blank)") || "";

  let scale = 3;
  let exportW = filmW * scale;
  let exportH = filmH * scale;

  let exportLayer = createGraphics(exportW, exportH);
  exportLayer.pixelDensity(1);
  exportLayer.background(255);

  exportLayer.image(printLayer, 0, 0, exportW, exportH);

  const blob = await new Promise(resolve => {
    exportLayer.canvas.toBlob(resolve, "image/png");
  });

  const filename = `cyanotype-${Date.now()}.png`;

  const uploadResult = await supabaseClient.storage
    .from("cyanotypes")
    .upload(filename, blob, {
      contentType: "image/png"
    });

  if (uploadResult.error) {
    console.error(uploadResult.error);
    alert("Upload failed. Check your Supabase storage policies.");
    uploadButton.html("submit");
    return;
  }

  const publicData = supabaseClient.storage
    .from("cyanotypes")
    .getPublicUrl(filename);

  const imageUrl = publicData.data.publicUrl;

  const dbResult = await supabaseClient
    .from("cyanotypes")
    .insert([
      {
        title: title || null,
        author: author,
        image_url: imageUrl,
        uv: uvIndex,
        device: facingMode
      }
    ]);

  if (dbResult.error) {
    console.error(dbResult.error);
    alert("Image uploaded, but database save failed.");
    uploadButton.html("submit");
    return;
  }

  alert("Uploaded to archive!");
  uploadButton.html("submit");
}

function getSunExposure() {
  if (!navigator.geolocation) {
    setUV(4);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      let lat = pos.coords.latitude;
      let lon = pos.coords.longitude;

      let url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + lat +
        "&longitude=" + lon +
        "&current=uv_index";

      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data.current && data.current.uv_index !== undefined) {
            setUV(data.current.uv_index);
          } else {
            setUV(4);
          }
        })
        .catch(() => {
          setUV(4);
        });
    },
    function () {
      setUV(4);
    }
  );
}

function setUV(value) {
  uvIndex = value;

  let sunMultiplier = map(uvIndex, 0, 10, 0.15, 2.8);
  sunMultiplier = constrain(sunMultiplier, 0.15, 3.2);

  exposeSpeed = baseExposeSpeed * sunMultiplier;

  let exposureMinutes = map(uvIndex, 0, 10, 28, 3);

  uvText =
    "UV " +
    nf(uvIndex, 1, 1) +
    " / " +
    nf(exposureMinutes, 1, 1) +
    " mins";
}

function drawInfo() {
  noStroke();

  fill(255, 255, 255, 230);
  rect(12, height - 58, width - 24, 42);

  fill(0, 45, 140);
  textFont("monospace");
  textSize(12);

  let status = exposing ? "exposing" : "paused";
  let cameraName = facingMode === "user" ? "front camera" : "rear camera";

  text(
    status + " / " + cameraName,
    24,
    height - 32
  );
}

function drawFineBlueSpeckles() {
  noStroke();

  blendMode(MULTIPLY);

  for (let i = 0; i < 220; i++) {
    fill(0, 70, 220, random(5, 16));

    circle(
      random(width),
      random(height),
      random(0.25, 1.1)
    );
  }

  blendMode(BLEND);
}

function makePaperTexture() {
  textureLayer.clear();
  textureLayer.background(255);
  textureLayer.loadPixels();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let i = (x + y * width) * 4;

      let fibre =
        noise(x * 0.018, y * 0.09) * 20 +
        noise(x * 0.35, y * 0.35) * 10 +
        random(-8, 8);

      let v = constrain(250 + fibre, 230, 255);

      textureLayer.pixels[i] = v;
      textureLayer.pixels[i + 1] = v;
      textureLayer.pixels[i + 2] = v;
      textureLayer.pixels[i + 3] = 12;
    }
  }

  textureLayer.updatePixels();
}

function styleButtons() {
  const baseBg = "#ffffff";
  const baseBorder = "1px solid #0033aa";
  const baseText = "#0033aa";

  const hoverBg = "#0033aa";
  const hoverBorder = "1px solid #0033aa";
  const hoverText = "#ffffff";

  let buttons = [
    exposeButton,
    saveButton,
    uploadButton,
    archiveButton,
    resetButton,
    flipButton,
    archiveCloseButton
  ].filter(Boolean);

  for (let b of buttons) {
    b.style("background", baseBg);
    b.style("border", baseBorder);
    b.style("color", baseText);
    b.style("padding", "10px 14px");
    b.style("font-family", "monospace");
    b.style("font-size", "12px");
    b.style("border-radius", "0");
    b.style("cursor", "pointer");

    b.mouseOver(() => {
      b.style("background", hoverBg);
      b.style("border", hoverBorder);
      b.style("color", hoverText);
    });

    b.mouseOut(() => {
      b.style("background", baseBg);
      b.style("border", baseBorder);
      b.style("color", baseText);
    });
  }
}

function isMobileDevice() {
  return (
    windowWidth < 768 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

function smoothstep(edge0, edge1, x) {
  x = constrain(
    (x - edge0) / (edge1 - edge0),
    0,
    1
  );

  return x * x * (3 - 2 * x);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  textureLayer = createGraphics(width, height);
  textureLayer.pixelDensity(1);
  makePaperTexture();

  if (flipButton) {
    if (isMobileDevice()) flipButton.show();
    else flipButton.hide();
  }

  if (archiveOverlay) {
    archiveOverlay.style("padding", isMobileDevice() ? "12px" : "24px");
  }

  if (archiveFrame) {
    archiveFrame.style("border", isMobileDevice() ? "0" : "1px solid #0033aa");
  }
}
