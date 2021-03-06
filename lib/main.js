var widgets = require("sdk/widget");
var tabs = require("sdk/tabs");
var data = require("sdk/self").data;
var ColorThief = require("./color-thief").ColorThief;
var utils = require("sdk/window/utils");

var workersMap = new WeakMap();

function getContentWindow() {
  var browserWindow = utils.getMostRecentBrowserWindow();
  return browserWindow.content;
}

function windowToCanvas() {
  var win = getContentWindow();
  var width = win.innerWidth + win.scrollMaxX;
  var height = win.innerHeight + win.scrollMaxY;

  var canvas = win.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  var ctx = canvas.getContext("2d");
  ctx.drawWindow(win, 0, 0, width, height, "rgb(255,255,255)");

  return canvas;
}

function getWindowPalette() {
  // Draw the active window's DOM to a canvas, then extract palette info
  var canvas = windowToCanvas();
  var colorThief = new ColorThief();
  return colorThief.getPalette(canvas);
}

function makeWorker(tab) {
  return tab.attach({
    contentScriptFile: data.url("webmaker-colours.js")
  });
}

function getWorkerForTab(tab) {
  if(workersMap.has(tab)) {
    return workersMap.get(tab);
  }

  // If the tab gets recycled, and a new page loaded, recreate the worker
  tab.on("ready", function(tab) {
    workersMap.set(tab, makeWorker(tab));
  });

  tab.on("close", function(tab) {
    workersMap.delete(tab);
  });

  var worker = makeWorker(tab);
  workersMap.set(tab, worker);
  return worker;
}

var widget = widgets.Widget({
  id: "webmaker-colours",
  label: "Webmaker Colours",
  contentURL: "https://webmaker.org/img/favicon.ico",
  onClick: function() {
    var worker = getWorkerForTab(tabs.activeTab);
    worker.port.on("ui-ready", function() {
      var palette = getWindowPalette();
      worker.port.emit("render-palette", palette);
    });
    worker.port.emit("setup-ui", {
      html: data.load("webmaker-colours.html"),
      css: data.load("webmaker-colours.css")
    });
  }
});

// TODO: add a context menu for this too.