// CYANOTYPE CAMERA — MOBILE 4:5 PORTRAIT FIX

let cam;
let printLayer;
let textureLayer;
let toolbar;

let exposureMap = [];

let filmW = 240;
let filmH = 300; // 4:5 portrait

let facingMode = "user";
let mirrorCamera = true;

let baseExposeSpeed = 0.002;
let exposeSpeed = 0.002;

let uvIndex = 4;
let uvText = "finding sun exposure...";

let exposing = false;

let exposeButton;
let saveButton;
let resetButton;
let flipButton;

function setup() {

  createCanvas(windowWidth, windowHeight);

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  pixelDensity(1);

  smooth();

  setupCamera();

  printLayer =
    createGraphics(filmW, filmH);

  printLayer.pixelDensity(1);

  textureLayer =
    createGraphics(width, height);

  textureLayer.pixelDensity(1);

  makePaperTexture();

  exposureMap =
    new Array(filmW * filmH).fill(0);

  toolbar = createDiv();

  toolbar.position(12, 12);

  toolbar.style("display", "flex");
  toolbar.style("gap", "8px");
  toolbar.style("flex-wrap", "wrap");
  toolbar.style("width", "calc(100vw - 24px)");
  toolbar.style("z-index", "10");

  exposeButton =
    createButton("○ start");

  exposeButton.parent(toolbar);

  exposeButton.mousePressed(toggleExposure);

  saveButton =
    createButton("download");

  saveButton.parent(toolbar);

  saveButton.mousePressed(downloadPrint);

  resetButton =
    createButton("new");

  resetButton.parent(toolbar);

  resetButton.mousePressed(resetExposure);

  flipButton =
    createButton("flip camera");

  flipButton.parent(toolbar);

  flipButton.mousePressed(flipCamera);

  styleButtons();

  getSunExposure();
}

function setupCamera() {

  if (cam) {
    cam.remove();
  }

  let constraints = {
    video: {
      facingMode: facingMode,
      width: { ideal: 1080 },
      height: { ideal: 1350 }
    },
    audio: false
  };

  cam =
    createCapture(constraints);

  cam.hide();

  mirrorCamera =
    facingMode === "user";
}

function draw() {

  background(255);

  if (
    !cam ||
    !cam.loadedmetadata
  ) {

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

      let idx =
        x + y * filmW;

      let sample =
        getCameraPixelCover(x, y);

      let r = sample.r;
      let g = sample.g;
      let b = sample.b;

      let luma =
        r * 0.299 +
        g * 0.587 +
        b * 0.114;

      let light =
        luma / 255;

      light =
        smoothstep(0.18, 0.88, light);

      let shadow =
        1.0 - light;

      shadow =
        pow(shadow, 1.3);

      let dose =
        shadow * exposeSpeed;

      exposureMap[idx] += dose;

      exposureMap[idx] =
        constrain(
          exposureMap[idx],
          0,
          1
        );
    }
  }
}

// TRUE PORTRAIT 4:5 CAMERA MAPPING
function getCameraPixelCover(x, y) {

  let vw = cam.width;
  let vh = cam.height;

  let sourceRatio = vw / vh;
  let targetRatio = filmW / filmH;

  let cropW;
  let cropH;
  let cropX;
  let cropY;

  // COVER = fills portrait frame

  if (sourceRatio > targetRatio) {

    cropH = vh;

    cropW =
      vh * targetRatio;

    cropX =
      (vw - cropW) * 0.5;

    cropY = 0;

  } else {

    cropW = vw;

    cropH =
      vw / targetRatio;

    cropX = 0;

    cropY =
      (vh - cropH) * 0.5;
  }

  let u =
    x / filmW;

  let v =
    y / filmH;

  if (mirrorCamera) {

    u = 1.0 - u;
  }

  let sx =
    floor(
      cropX + u * cropW
    );

  let sy =
    floor(
      cropY + v * cropH
    );

  sx =
    constrain(
      sx,
      0,
      vw - 1
    );

  sy =
    constrain(
      sy,
      0,
      vh - 1
    );

  let i =
    (sx + sy * vw) * 4;

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

      let idx =
        x + y * filmW;

      let i =
        idx * 4;

      let e =
        exposureMap[idx];

      let ink =
        pow(e, 0.62);

      let paperR = 255;
      let paperG = 255;
      let paperB = 255;

      // richer cyanotype blue

      let blueR = 0;
      let blueG = 70;
      let blueB = 255;

      let deepR = 0;
      let deepG = 12;
      let deepB = 145;

      let targetR =
        lerp(
          blueR,
          deepR,
          ink
        );

      let targetG =
        lerp(
          blueG,
          deepG,
          ink
        );

      let targetB =
        lerp(
          blueB,
          deepB,
          ink
        );

      let finalR =
        lerp(
          paperR,
          targetR,
          ink
        );

      let finalG =
        lerp(
          paperG,
          targetG,
          ink
        );

      let finalB =
        lerp(
          paperB,
          targetB,
          ink
        );

      let n1 =
        noise(
          x * 0.09,
          y * 0.09
        );

      let n2 =
        noise(
          x * 0.45,
          y * 0.45
        );

      let texture =
        (n1 - 0.5) * 18 +
        (n2 - 0.5) * 10;

      finalR += texture * 0.12;
      finalG += texture * 0.22;
      finalB += texture * 0.5;

      let d =
        min(
          x,
          y,
          filmW - 1 - x,
          filmH - 1 - y
        );

      let edgeFade =
        smoothstep(0, 6, d);

      finalR =
        lerp(
          paperR,
          finalR,
          edgeFade
        );

      finalG =
        lerp(
          paperG,
          finalG,
          edgeFade
        );

      finalB =
        lerp(
          paperB,
          finalB,
          edgeFade
        );

      printLayer.pixels[i] =
        constrain(finalR, 0, 255);

      printLayer.pixels[i + 1] =
        constrain(finalG, 0, 255);

      printLayer.pixels[i + 2] =
        constrain(finalB, 0, 255);

      printLayer.pixels[i + 3] =
        255;
    }
  }

  printLayer.updatePixels();

  printLayer.filter(BLUR, 0.10);
}

// TRUE 4:5 DISPLAY
function drawPrintToCanvas() {

  drawingContext.imageSmoothingEnabled = true;

  drawingContext.imageSmoothingQuality =
    "high";

  let topSafe = 110;
  let bottomSafe = 70;

  let availableW =
    width * 0.92;

  let availableH =
    height -
    topSafe -
    bottomSafe;

  let w =
    availableW;

  let h =
    w * 5 / 4;

  if (h > availableH) {

    h =
      availableH;

    w =
      h * 4 / 5;
  }

  let x =
    (width - w) * 0.5;

  let y =
    topSafe +
    (availableH - h) * 0.5;

  image(
    printLayer,
    x,
    y,
    w,
    h
  );
}

function toggleExposure() {

  exposing = !exposing;

  exposeButton.html(
    exposing
      ? "● pause"
      : "○ start"
  );
}

function resetExposure() {

  exposureMap =
    new Array(
      filmW * filmH
    ).fill(0);
}

function flipCamera() {

  facingMode =
    facingMode === "user"
      ? "environment"
      : "user";

  setupCamera();
}

function downloadPrint() {

  let scale = 5;

  let exportW =
    filmW * scale;

  let exportH =
    filmH * scale;

  let exportLayer =
    createGraphics(
      exportW,
      exportH
    );

  exportLayer.pixelDensity(1);

  exportLayer.background(255);

  exportLayer.image(
    printLayer,
    0,
    0,
    exportW,
    exportH
  );

  exportLayer.save(
    "sun-machine.png"
  );
}

function getSunExposure() {

  if (!navigator.geolocation) {

    setUV(4);

    return;
  }

  navigator.geolocation.getCurrentPosition(

    function (pos) {

      let lat =
        pos.coords.latitude;

      let lon =
        pos.coords.longitude;

      let url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + lat +
        "&longitude=" + lon +
        "&current=uv_index";

      fetch(url)

        .then(r => r.json())

        .then(data => {

          if (
            data.current &&
            data.current.uv_index !== undefined
          ) {

            setUV(
              data.current.uv_index
            );

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

  let sunMultiplier =
    map(
      uvIndex,
      0,
      10,
      0.15,
      2.8
    );

  sunMultiplier =
    constrain(
      sunMultiplier,
      0.15,
      3.2
    );

  exposeSpeed =
    baseExposeSpeed *
    sunMultiplier;

  let exposureMinutes =
    map(
      uvIndex,
      0,
      10,
      28,
      3
    );

  uvText =
    "UV " +
    nf(uvIndex, 1, 1) +
    " / " +
    nf(exposureMinutes, 1, 1) +
    " mins";
}

function drawInfo() {

  noStroke();

  fill(
    255,
    255,
    255,
    230
  );

  rect(
    12,
    height - 58,
    width - 24,
    42
  );

  fill(
    0,
    45,
    140
  );

  textFont("monospace");

  textSize(12);

  let status =
    exposing
      ? "exposing"
      : "paused";

  let cameraName =
    facingMode === "user"
      ? "front camera"
      : "rear camera";

  text(
    status +
    " / " +
    cameraName +
    " / " +
    uvText,
    24,
    height - 32
  );
}

function drawFineBlueSpeckles() {

  noStroke();

  blendMode(MULTIPLY);

  for (let i = 0; i < 220; i++) {

    fill(
      0,
      70,
      220,
      random(5, 16)
    );

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

      let i =
        (x + y * width) * 4;

      let fibre =
        noise(
          x * 0.018,
          y * 0.09
        ) * 20 +

        noise(
          x * 0.35,
          y * 0.35
        ) * 10 +

        random(-8, 8);

      let v =
        constrain(
          250 + fibre,
          230,
          255
        );

      textureLayer.pixels[i] = v;
      textureLayer.pixels[i + 1] = v;
      textureLayer.pixels[i + 2] = v;
      textureLayer.pixels[i + 3] = 12;
    }
  }

  textureLayer.updatePixels();
}

function styleButtons() {

  let buttons = [
    exposeButton,
    saveButton,
    resetButton,
    flipButton
  ];

  for (let b of buttons) {

    b.style(
      "background",
      "#ffffff"
    );

    b.style(
      "border",
      "1px solid #0033aa"
    );

    b.style(
      "color",
      "#0033aa"
    );

    b.style(
      "padding",
      "10px 14px"
    );

    b.style(
      "font-family",
      "monospace"
    );

    b.style(
      "font-size",
      "12px"
    );

    b.style(
      "border-radius",
      "0"
    );

    b.style(
      "cursor",
      "pointer"
    );
  }
}

function smoothstep(
  edge0,
  edge1,
  x
) {

  x =
    constrain(
      (x - edge0) /
      (edge1 - edge0),
      0,
      1
    );

  return x * x * (3 - 2 * x);
}

function windowResized() {

  resizeCanvas(
    windowWidth,
    windowHeight
  );

  textureLayer =
    createGraphics(
      width,
      height
    );

  textureLayer.pixelDensity(1);

  makePaperTexture();
}