// CYANOTYPE CAMERA — SUPABASE ARCHIVE VERSION

const SUPABASE_URL = "https://diucjrosczolxsyxyufm.supabase.co";
const SUPABASE_KEY = "sb_publishable_07b9tiSnGQE1deWh2kbtKA_JZmwauAj";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let cam;
let printLayer;
let previewLayer;
let textureLayer;
let toolbar;
let bottomBar;
let captureControl;
let exposureSpeedControl;
let exposureSpeedSlider;
let topRightBar;
let uvIndicator;
let siteTitle;

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
let lastCaptureControlLeft = null;
let lastExposureSpeedControlLeft = null;
let lastToolbarLeft = null;
let lastToolbarWidth = null;

let exposureMap = [];

let filmW = 480;
let filmH = 600; // 4:5 portrait

let facingMode = "user";
let mirrorCamera = true;

let baseExposeSpeed = 0.02;
let exposeSpeed = 0.02;
let uvSpeedMultiplier = 1;
let exposureSpeedMultiplier = 1;

let uvIndex = 4;
let uvText = "finding sun exposure...";

let exposing = false;
let hasStartedExposure = false;
let exposureTransitionStart = null;

const EXPOSURE_COLOR_TRANSITION_MS = 1800;

let exposeButton;
let saveButton;
let resetButton;
let flipButton;
let uploadButton;
let archiveButton;

function setup() {
  // Hint to the browser that we'll read pixels often.
  // Must be set before the 2D context is created.
  setAttributes("willReadFrequently", true);

  createCanvas(windowWidth, windowHeight);

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  pixelDensity(1);
  smooth();

  setupCamera();

  printLayer = createGraphics(filmW, filmH);
  printLayer.pixelDensity(1);

  previewLayer = createGraphics(filmW, filmH);
  previewLayer.pixelDensity(1);

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

  siteTitle = createDiv("Blewprint");
  siteTitle.style("position", "fixed");
  siteTitle.style("left", "12px");
  siteTitle.style("top", isMobileDevice() ? "20px" : "14px");
  siteTitle.style("transform", `rotate(${random(-4, 4).toFixed(2)}deg)`);
  siteTitle.style("transform-origin", "left center");
  siteTitle.style("z-index", "10");
  siteTitle.style("color", "#0033aa");
  siteTitle.style("font-family", "'Jelek', 'Source Code Pro', monospace");
  siteTitle.style("font-size", "clamp(20px, 2.8vw, 36px)");
  siteTitle.style("line-height", "0.9");
  siteTitle.style("letter-spacing", "0.01em");
  siteTitle.style("overflow", "visible");
  siteTitle.style("white-space", "nowrap");
  siteTitle.style("pointer-events", "none");
  siteTitle.style("-webkit-font-smoothing", "antialiased");
  siteTitle.style("text-rendering", "geometricPrecision");

  topRightBar = createDiv();
  topRightBar.style("position", "fixed");
  topRightBar.style("top", "12px");
  topRightBar.style("right", "12px");
  topRightBar.style("z-index", "120");

  bottomBar = createDiv();
  bottomBar.style("position", "fixed");
  bottomBar.style("left", "0px");
  bottomBar.style("bottom", "72px");
  bottomBar.style("transform", "none");
  bottomBar.style("z-index", "10");
  bottomBar.style("display", "flex");
  bottomBar.style("gap", "8px");

  captureControl = createDiv();
  captureControl.style("position", "fixed");
  captureControl.style("left", "50%");
  captureControl.style("bottom", "54px");
  captureControl.style("transform", "translateX(-50%)");
  captureControl.style("z-index", "12");
  captureControl.style("display", "flex");
  captureControl.style("align-items", "center");
  captureControl.style("justify-content", "center");

  exposureSpeedControl = createDiv();
  exposureSpeedControl.addClass("sun-speed-control");
  exposureSpeedControl.style("position", "fixed");
  exposureSpeedControl.style("left", "50%");
  exposureSpeedControl.style("top", "0px");
  exposureSpeedControl.style("transform", "translateX(-50%)");
  exposureSpeedControl.style("z-index", "12");
  exposureSpeedControl.style("display", "flex");
  exposureSpeedControl.style("align-items", "center");
  exposureSpeedControl.style("gap", "12px");

  const sunIcon = createImg("sun.svg", "Sun exposure speed");
  sunIcon.parent(exposureSpeedControl);
  sunIcon.addClass("sun-speed-icon");
  sunIcon.style("width", isMobileDevice() ? "20px" : "24px");
  sunIcon.style("height", isMobileDevice() ? "20px" : "24px");
  sunIcon.style("max-width", isMobileDevice() ? "20px" : "24px");
  sunIcon.style("max-height", isMobileDevice() ? "20px" : "24px");
  sunIcon.style("flex", `0 0 ${isMobileDevice() ? "20px" : "24px"}`);
  sunIcon.style("object-fit", "contain");
  sunIcon.style("display", "block");

  exposureSpeedSlider = createSlider(0.15, 2.6, 1, 0.025);
  exposureSpeedSlider.parent(exposureSpeedControl);
  exposureSpeedSlider.addClass("sun-speed-slider");
  exposureSpeedSlider.attribute("aria-label", "Sun exposure speed");
  exposureSpeedSlider.input(() => {
    exposureSpeedMultiplier = Number(exposureSpeedSlider.value());
    updateExposureSpeed();
  });

  uvIndicator = createDiv(uvText);
  uvIndicator.addClass("uv-indicator");
  uvIndicator.style("position", "fixed");
  uvIndicator.style("left", "12px");
  uvIndicator.style("right", "auto");
  uvIndicator.style("bottom", "16px");
  uvIndicator.style("z-index", "10");
  uvIndicator.style("box-sizing", "border-box");
  uvIndicator.style("padding", "12px");
  uvIndicator.style("width", "max-content");
  uvIndicator.style("max-width", "calc(100vw - 24px)");
  uvIndicator.style("background", "rgba(255, 255, 255, 0.9)");
  uvIndicator.style("color", "#002d8c");
  uvIndicator.style("font-family", "'Source Code Pro', monospace");
  uvIndicator.style("font-size", "13px");
  uvIndicator.style("line-height", "1.25");
  uvIndicator.style("-webkit-font-smoothing", "antialiased");
  uvIndicator.style("text-rendering", "geometricPrecision");

  flipButton = createButton("Flip");
  flipButton.parent(toolbar);
  flipButton.mousePressed(flipCamera);
  if (!isMobileDevice()) {
    flipButton.hide();
  }

  archiveButton = createButton("Archive");
  archiveButton.parent(topRightBar);
  archiveButton.style("transform", `rotate(${random(-4, 4).toFixed(2)}deg)`);
  archiveButton.style("transform-origin", "center center");
  archiveButton.mousePressed(() => {
    if (isArchiveOpen) closeArchiveOverlay();
    else openArchiveOverlay();
  });

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
  archiveOverlay.style(
    "transition",
    `opacity ${ARCHIVE_TRANSITION_MS}ms ease, clip-path ${ARCHIVE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
  );
  archiveOverlay.style("will-change", "opacity, clip-path");
  archiveOverlay.style(
    "clip-path",
    "circle(0px at var(--archive-origin-x, 100%) var(--archive-origin-y, 0%))"
  );

  archiveOverlayInner = createDiv();
  archiveOverlayInner.parent(archiveOverlay);
  archiveOverlayInner.style("width", "100%");
  archiveOverlayInner.style("height", "100%");
  archiveOverlayInner.style("filter", "blur(12px)");
  archiveOverlayInner.style(
    "transition",
    `filter ${ARCHIVE_TRANSITION_MS}ms ease`
  );
  archiveOverlayInner.style("will-change", "filter");

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

  exposeButton = createButton("○ Start");
  exposeButton.parent(captureControl);
  exposeButton.mousePressed(toggleExposure);

  resetButton = createButton("New");
  resetButton.parent(bottomBar);
  resetButton.mousePressed(resetExposure);
  resetButton.hide();

  saveButton = createButton("Download");
  saveButton.parent(bottomBar);
  saveButton.mousePressed(downloadPrint);
  saveButton.hide();

  uploadButton = createButton("Submit");
  uploadButton.parent(bottomBar);
  uploadButton.mousePressed(uploadToArchive);
  uploadButton.hide();

  styleButtons();

  getSunExposure();
}

function setArchiveOverlayOriginFromButton() {
  if (!archiveButton || !archiveOverlay) return;

  const rect = archiveButton.elt.getBoundingClientRect();
  const x = rect.left + rect.width * 0.5;
  const y = rect.top + rect.height * 0.5;

  archiveOverlay.elt.style.setProperty("--archive-origin-x", `${x}px`);
  archiveOverlay.elt.style.setProperty("--archive-origin-y", `${y}px`);
}

function openArchiveOverlay() {
  isArchiveOpen = true;
  archiveFrame.attribute("src", "archive.html");
  archiveButton.elt.textContent = "Close";
  setArchiveOverlayOriginFromButton();

  archiveOverlay.style("pointer-events", "auto");
  archiveOverlay.style("opacity", "1");
  archiveOverlay.style(
    "clip-path",
    "circle(160vmax at var(--archive-origin-x, 100%) var(--archive-origin-y, 0%))"
  );
  archiveOverlayInner.style("filter", "blur(0px)");
}

function closeArchiveOverlay() {
  isArchiveOpen = false;
  archiveButton.elt.textContent = "Archive";
  setArchiveOverlayOriginFromButton();

  archiveOverlay.style("opacity", "0");
  archiveOverlay.style(
    "clip-path",
    "circle(0px at var(--archive-origin-x, 100%) var(--archive-origin-y, 0%))"
  );
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

  const videoConstraints = isMobileDevice()
    ? { facingMode: facingMode }
    : {
        facingMode: facingMode,
        width: { ideal: 1080 },
        height: { ideal: 1350 }
      };

  let constraints = {
    video: videoConstraints,
    audio: false
  };

  cam = createCapture(constraints);
  cam.hide();

  mirrorCamera = facingMode === "user";
}

function syncCameraSizeToNativeVideo() {
  if (!cam || !cam.elt) return;

  const nativeW = cam.elt.videoWidth;
  const nativeH = cam.elt.videoHeight;

  if (!nativeW || !nativeH) return;

  if (cam.width !== nativeW || cam.height !== nativeH) {
    cam.size(nativeW, nativeH);
  }
}

function draw() {
  background(255);

  if (!cam || !cam.loadedmetadata) {
    drawInfo();
    return;
  }

  syncCameraSizeToNativeVideo();
  cam.loadPixels();

  if (cam.pixels.length === 0) {
    drawInfo();
    return;
  }

  if (exposing) {
    accumulateExposure();
  }

  renderPrint();

  if (!hasStartedExposure) {
    drawCameraPreviewToCanvas();
  } else if (exposureTransitionStart !== null) {
    drawExposureTransitionToCanvas();
  } else {
    drawPrintToCanvas();
  }

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

  let visibleX = 0;
  let visibleY = 0;
  let visibleW = filmW;
  let visibleH = filmH;

  if (sourceRatio > targetRatio) {
    visibleH = filmW / sourceRatio;
    visibleY = (filmH - visibleH) * 0.5;
  } else {
    visibleW = filmH * sourceRatio;
    visibleX = (filmW - visibleW) * 0.5;
  }

  if (
    x < visibleX ||
    x >= visibleX + visibleW ||
    y < visibleY ||
    y >= visibleY + visibleH
  ) {
    return {
      r: 255,
      g: 255,
      b: 255
    };
  }

  let u = (x - visibleX) / visibleW;
  let v = (y - visibleY) / visibleH;

  if (mirrorCamera) u = 1.0 - u;

  let sx = floor(u * vw);
  let sy = floor(v * vh);

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
      let edgeFade = smoothstep(0, isMobileDevice() ? 2 : 10, d);

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

function renderCameraPreview() {
  previewLayer.loadPixels();

  for (let y = 0; y < filmH; y++) {
    for (let x = 0; x < filmW; x++) {
      let idx = x + y * filmW;
      let i = idx * 4;
      let sample = getCameraPixelCover(x, y);

      let luma =
        sample.r * 0.299 +
        sample.g * 0.587 +
        sample.b * 0.114;

      let light = luma / 255;
      light = smoothstep(0.18, 0.88, light);

      let shadow = 1.0 - light;
      shadow = pow(shadow, 1.3);

      // Faint unexposed cyanotype guide: yellow before it begins turning blue,
      // but it does not write into exposureMap.
      let e = shadow * 0.055;
      let ink = pow(e, 0.62);

      let paperR = 252;
      let paperG = 247;
      let paperB = 224;

      let yellowR = 204;
      let yellowG = 184;
      let yellowB = 92;

      let targetR = yellowR;
      let targetG = yellowG;
      let targetB = yellowB;

      let finalR = lerp(paperR, targetR, ink);
      let finalG = lerp(paperG, targetG, ink);
      let finalB = lerp(paperB, targetB, ink);

      let d = min(x, y, filmW - 1 - x, filmH - 1 - y);
      let edgeFade = smoothstep(0, isMobileDevice() ? 2 : 10, d);

      finalR = lerp(paperR, finalR, edgeFade);
      finalG = lerp(paperG, finalG, edgeFade);
      finalB = lerp(paperB, finalB, edgeFade);

      previewLayer.pixels[i] = constrain(finalR, 0, 255);
      previewLayer.pixels[i + 1] = constrain(finalG, 0, 255);
      previewLayer.pixels[i + 2] = constrain(finalB, 0, 255);
      previewLayer.pixels[i + 3] = 255;
    }
  }

  previewLayer.updatePixels();
}

function drawPrintToCanvas() {
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  let topSafe = 90;
  let bottomSafe = 150;

  const sideInset = isMobileDevice() ? 24 : width * 0.04;
  let availableW = max(1, width - sideInset * 2);
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
}

function drawCameraPreviewToCanvas() {
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";
  renderCameraPreview();

  let topSafe = 90;
  let bottomSafe = 150;

  const sideInset = isMobileDevice() ? 24 : width * 0.04;
  let availableW = max(1, width - sideInset * 2);
  let availableH = height - topSafe - bottomSafe;

  let w = availableW;
  let h = w * 5 / 4;

  if (h > availableH) {
    h = availableH;
    w = h * 4 / 5;
  }

  let x = (width - w) * 0.5;
  let y = topSafe + (availableH - h) * 0.5;

  image(previewLayer, x, y, w, h);
  updateToolbarAlignment(x, y, w, h);
  updateBottomBarAlignment(x, y, w, h);
}

function drawExposureTransitionToCanvas() {
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";
  renderCameraPreview();

  let topSafe = 90;
  let bottomSafe = 150;

  const sideInset = isMobileDevice() ? 24 : width * 0.04;
  let availableW = max(1, width - sideInset * 2);
  let availableH = height - topSafe - bottomSafe;

  let w = availableW;
  let h = w * 5 / 4;

  if (h > availableH) {
    h = availableH;
    w = h * 4 / 5;
  }

  let x = (width - w) * 0.5;
  let y = topSafe + (availableH - h) * 0.5;

  let t = constrain(
    (millis() - exposureTransitionStart) / EXPOSURE_COLOR_TRANSITION_MS,
    0,
    1
  );
  let fade = smoothstep(0, 1, t);

  image(previewLayer, x, y, w, h);

  push();
  tint(255, fade * 255);
  image(printLayer, x, y, w, h);
  pop();

  if (t >= 1) {
    exposureTransitionStart = null;
  }

  updateToolbarAlignment(x, y, w, h);
  updateBottomBarAlignment(x, y, w, h);
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

  updateFrameButtonAlignment(frameX, frameY, frameW);
}

function updateFrameButtonAlignment(frameX, frameY, frameW) {
  const top = Math.round(frameY + 10);
  const inset = 10;

  if (resetButton && hasStartedExposure) {
    resetButton.show();
    resetButton.style("position", "fixed");
    resetButton.style("top", `${top}px`);
    resetButton.style("left", `${Math.round(frameX + inset)}px`);
    resetButton.style("z-index", "12");
  }

  if (flipButton) {
    if (!isMobileDevice()) {
      flipButton.hide();
      return;
    }

    flipButton.show();
    flipButton.html("Flip");
    flipButton.style("position", "fixed");
    flipButton.style("top", `${top}px`);
    flipButton.style(
      "left",
      `${Math.round(frameX + frameW - flipButton.elt.offsetWidth - inset)}px`
    );
    flipButton.style("z-index", "12");
  }
}

function updateBottomBarAlignment(frameX, frameY, frameW, frameH) {
  const left = Math.round(frameX);
  const center = Math.round(frameX + frameW * 0.5);
  const circleTop = Math.round(frameY + frameH + 16);
  const buttonGap = 52;

  if (lastBottomBarLeft !== left) {
    lastBottomBarLeft = left;
  }

  if (lastCaptureControlLeft !== center) {
    captureControl.style("left", `${center}px`);
    lastCaptureControlLeft = center;
  }

  if (lastExposureSpeedControlLeft !== center) {
    exposureSpeedControl.style("left", `${center}px`);
    lastExposureSpeedControlLeft = center;
  }

  if (captureControl) {
    captureControl.style("bottom", "auto");
    captureControl.style("top", `${circleTop}px`);
  }

  if (exposureSpeedControl) {
    const sliderTop = Math.round(circleTop + 82);
    exposureSpeedControl.style("top", `${sliderTop}px`);
    exposureSpeedControl.style("width", `${Math.min(frameW, 420)}px`);
  }

  const circleH = exposeButton?.elt?.offsetHeight || 62;
  const saveH = saveButton?.elt?.offsetHeight || 40;
  const uploadH = uploadButton?.elt?.offsetHeight || 40;

  if (saveButton && saveButton.elt.offsetWidth) {
    saveButton.style("position", "fixed");
    saveButton.style("top", `${Math.round(circleTop + (circleH - saveH) * 0.5)}px`);
    saveButton.style(
      "left",
      `${Math.round(center - 31 - buttonGap - saveButton.elt.offsetWidth)}px`
    );
    saveButton.style("z-index", "12");
  }

  if (uploadButton) {
    uploadButton.style("position", "fixed");
    uploadButton.style("top", `${Math.round(circleTop + (circleH - uploadH) * 0.5)}px`);
    uploadButton.style("left", `${Math.round(center + 31 + buttonGap)}px`);
    uploadButton.style("z-index", "12");
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
  const isNewExposure = !hasStartedExposure;

  exposing = !exposing;
  exposeButton.html("");
  updateExposeButtonState();

  if (exposing) {
    hasStartedExposure = true;
    exposureTransitionStart = isNewExposure ? millis() : null;
  } else {
    exposureTransitionStart = null;
  }

  updateSubmitVisibility();
}

function resetExposure() {
  exposureMap = new Array(filmW * filmH).fill(0);

  exposing = false;
  hasStartedExposure = false;
  exposureTransitionStart = null;
  exposeButton.html("");
  updateExposeButtonState();
  updateSubmitVisibility();
}

function updateExposeButtonState() {
  if (!exposeButton) return;

  exposeButton.html("");

  if (exposing) {
    exposeButton.addClass("is-recording");
    exposeButton.style("background", "#0033aa");
    exposeButton.style("border", "1px solid #0033aa");
    exposeButton.attribute("aria-label", "Pause exposure");
    exposeButton.attribute("title", "Pause");
  } else {
    exposeButton.removeClass("is-recording");
    exposeButton.style("background", "#ffffff");
    exposeButton.style("border", "1px solid #0033aa");
    exposeButton.attribute("aria-label", hasStartedExposure ? "Resume exposure" : "Start exposure");
    exposeButton.attribute("title", hasStartedExposure ? "Resume" : "Start");
  }
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
  uploadButton.html("Uploading...");

  let title = prompt("Name/title (optional — leave blank)");
  if (title === null) {
    uploadButton.html("Submit");
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
    uploadButton.html("Submit");
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
    uploadButton.html("Submit");
    return;
  }

  alert("Uploaded to archive!");
  uploadButton.html("Submit");
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

  uvSpeedMultiplier = map(uvIndex, 0, 10, 0.15, 2.8);
  uvSpeedMultiplier = constrain(uvSpeedMultiplier, 0.15, 3.2);

  updateExposureSpeed();
}

function updateExposureSpeed() {
  exposeSpeed = baseExposeSpeed * uvSpeedMultiplier * exposureSpeedMultiplier;

  let exposureMinutes = map(uvIndex, 0, 10, 28, 3) / exposureSpeedMultiplier;

  exposureMinutes = max(0.5, exposureMinutes);

  uvText =
    "UV " +
    nf(uvIndex, 1, 1) +
    " / " +
    nf(exposureMinutes, 1, 1) +
    " mins";
}

function drawInfo() {
  if (uvIndicator) uvIndicator.html(uvText);
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
    saveButton,
    uploadButton,
    archiveButton,
    resetButton,
    flipButton,
    archiveCloseButton
  ].filter(Boolean);

  for (let b of buttons) {
    const isArchiveButton = b === archiveButton;
    const defaultBg = isArchiveButton ? hoverBg : baseBg;
    const defaultBorder = isArchiveButton ? hoverBorder : baseBorder;
    const defaultText = isArchiveButton ? hoverText : baseText;
    const activeBg = isArchiveButton ? baseBg : hoverBg;
    const activeBorder = isArchiveButton ? baseBorder : hoverBorder;
    const activeText = isArchiveButton ? baseText : hoverText;

    b.style("background", defaultBg);
    b.style("border", defaultBorder);
    b.style("color", defaultText);
    b.style("padding", "10px 14px");
    b.style("font-family", "'Source Code Pro', monospace");
    b.style("font-size", "13px");
    b.style("border-radius", "0");
    b.style("cursor", "pointer");

    b.mouseOver(() => {
      b.style("background", activeBg);
      b.style("border", activeBorder);
      b.style("color", activeText);
    });

    b.mouseOut(() => {
      b.style("background", defaultBg);
      b.style("border", defaultBorder);
      b.style("color", defaultText);
    });
  }

  styleExposeButton();
  updateExposeButtonState();
}

function styleExposeButton() {
  if (!exposeButton) return;

  exposeButton.addClass("expose-control");
  exposeButton.html("");
  exposeButton.style("width", "62px");
  exposeButton.style("height", "62px");
  exposeButton.style("padding", "0");
  exposeButton.style("border-radius", "50%");
  exposeButton.style("border", "1px solid #0033aa");
  exposeButton.style("background", "#ffffff");
  exposeButton.style("color", "transparent");
  exposeButton.style("font-size", "0");
  exposeButton.style("font-weight", "600");
  exposeButton.style("line-height", "1");
  exposeButton.style("display", "flex");
  exposeButton.style("align-items", "center");
  exposeButton.style("justify-content", "center");
  exposeButton.style("box-shadow", "0 0 0 8px rgba(255, 255, 255, 0.75)");
  exposeButton.style("cursor", "pointer");
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
