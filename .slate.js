var log = true;

var apps = {
  'Sublime Text 2': {
    minWidth: 750,
    minHeight: 720
  },
  'Google Chrome': {
    minWidth: 800,
    minHeight: 600
  },
  'Sparrow': {
    minWidth: 800,
    minHeight: 600
  },
  'Terminal': {
    minWidth: 200,
    minHeight: 600
  },
  'iTunes': {
    minWidth: 850,
    minHeight: 550
  },
  'Spotify': {
    minWidth: 850,
    minHeight: 550
  },
  'Safari':{
    minWidth: 0,
    minHeight: 0
  }
};

function confirmResize(win, resized, target){
  var s = win.size();
  resized = s.width == target.width && s.height == target.height && resized;
  if (!resized){
    // seems sometimes the resize doesn't take, retry
    win.resize(target);
  }
}

function tile(app, region, direction){
  // app - a slate app
  // region an object with x,y,w,h and screen
  // direction - vertical, horizontal, clockwise, anti-clockwise

  var visibleWindows = [];
  app.eachWindow(function(win){
    if(win.hidden() === 0 && win.title()){
      slate.log(app.name() + ': ' + win.title());
      visibleWindows.push(win);
    }
  });
  var windows = visibleWindows.length;

  var winSize = {
    'width': 0,
    'height': 0
  };

  if (direction === 'vertical'){
    winSize.width = region.width;
    winSize.height = region.height / windows;
  } else if (direction === 'horizontal') {
    winSize.width = region.width / windows;
    winSize.height = region.height;
  }

  slate.log(app.name() + ': tiling ' + windows + ' windows ' + direction + 'ly');
  var i = 0;
  var j = 0;
  _.each(visibleWindows, function(win){
    var resized = win.resize(winSize);
    win.move({
      'x': region.x + (j * winSize.width),
      'y': region.y + (i * winSize.height),
      'screen': region.screen
    });
    confirmResize(win, resized, winSize);
    if(direction === 'vertical'){
      i += 1;
    } else if (direction === 'horizontal'){
      j += 1;
    }
  });
}

var quarterScreen = function(win, quarter, scr){
  var quarters = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  if (_.contains(quarters, quarter)){
    var cornerQuarter = slate.operation("corner", {
      'direction': quarter,
      'width': 'screenSizeX/2',
      'height': 'screenSizeY/2',
      'screen': scr
    });
    win.doOperation(cornerQuarter);
  } else {
    slate.log('unknown quarter');
  }
};

function halfScreen(win, half, scr){
  var halves = {
    'top': {
      'direction': 'top-left',
      'width': 'screenSizeX',
      'height': 'screenSizeY/2',
      'screen': scr
    },
    'bottom': {
      'direction': 'bottom-left',
      'width': 'screenSizeX',
      'height': 'screenSizeY/2',
      'screen': scr
    },
    'left': {
      'direction': 'top-left',
      'width': 'screenSizeX/2',
      'height': 'screenSizeY',
      'screen': scr
    },
    'right':{
      'direction': 'top-right',
      'width': 'screenSizeX/2',
      'height': 'screenSizeY',
      'screen': scr
    }
  };
  if (_.contains(_.keys(halves), half)){
    var cornerHalf = slate.operation("corner", halves[half]);
    win.doOperation(cornerHalf);
  } else {
    slate.log('unknown half');
  }
}

function fullScreen(win, scr){
  slate.log('making ' + win.title() + ' full screen on screen ' + scr.id());
}

function laptopOnly(win){
  // If win is either subl, keynote or chrome make it 80% screen and centered
  var scr = slate.screen();
  var app = slate.app();
  var appsToFocus = ['Google Chrome', 'Sublime Text 2', 'Keynote'];
  var appsToTile = ['Terminal'];
  var appsToCentre = ['Sparrow'];

  slate.eachApp(function(app){
    // If either subl or chrome are visible make them it 60% screen at LHS (tile?)
    if (_.contains(appsToFocus, app.name())){
      slate.log("focussing " + app.name());
      leftHandSideTile(app, 0.6);
    }
    // If sparrow is visible make it 90% w/h in centre
    if (_.contains(appsToCentre, app.name())){
      var winSize = {
        'width': scr.vrect().width * 0.9 ,
        'height': scr.vrect().height * 0.9
      };
      var resized = win.resize(winSize);
      win.move({
        'x': scr.vrect().width * 0.05,
        'y': scr.vrect().height * 0.05
      });
      confirmResize(win, resized, winSize);
    }
    // If terminals are open tile them on lhs equiv. f9:cmd,ctrl
    if (_.contains(appsToTile, app.name())){
      leftHandSideTile(app, 0.4);
    }
    // Hide everything else

  });

  if (win && _.contains(appsToFocus, app.name())){
    var winSize = {
      'width': scr.vrect().width * 0.8 ,
      'height': scr.vrect().height
    };
    var resized = win.resize(winSize);
    win.move({
      'x': scr.vrect().width * 0.1,
      'y': scr.vrect().y
    });
    confirmResize(win, resized, winSize);
  }
}

function getWidthAndHeight(app, w, h){
  var resizeTo = {};
  resizeTo.Width = w > apps[app.name()].minWidth ? w : apps[app.name()].minWidth;
  resizeTo.Height = h > apps[app.name()].minHeight ? h : apps[app.name()].minHeight;
  return resizeTo;
}

function leftHandSideTile(app, size){
  var scr  = slate.screen();
  var view = scr.vrect();
  var resizeTo = getWidthAndHeight(app, view.width * size, view.height);
  var region = {
    'x':scr.vrect().x,
    'y':scr.vrect().y,
    'width': resizeTo.Width,
    'height': resizeTo.Height,
    'screen': scr
  };
  tile(app, region, 'vertical');
}

var takeSnapshot = function(snapshot){
  var awareSnapshot = snapshot + '-' + slate.screenCount();
  slate.log("Take " + awareSnapshot);
  var operation = slate.operation('snapshot', {
    'name': awareSnapshot,
    'save': true,
    'stack' : true
  });
  operation.run();
  slate.log("Taken " + awareSnapshot);
};

var restoreSnapshot = function(snapshot){
  var awareSnapshot = snapshot + '-' + slate.screenCount();
  slate.log("Restore " + awareSnapshot);
  var restore = slate.operation('activate-snapshot', {'name': awareSnapshot});
  restore.run();
  slate.log("Restored " + awareSnapshot);
};

// Binding things together

slate.bind("f7:cmd", function(frontwin) {
  // chain might be good for this, rotate through various tile regions
  slate.log('f7:cmd :' + frontwin);

  if(frontwin){
    leftHandSideTile(frontwin.app(), 0.5);
  }
});
slate.bind("f7:cmd,ctrl", function(frontwin) {
  // chain might be good for this, rotate through various tile regions
  slate.log('f7:cmd,ctrl :' + frontwin);
  if(frontwin){
    leftHandSideTile(frontwin.app(), 0.4);
  }
});

slate.bind("f8:cmd", function(frontwin) {
  // chain might be good for this, rotate through various tile regions
  slate.log("f8:cmd");
  if(frontwin){
    leftHandSideTile(frontwin.app(), 1);
  }
});

slate.bind("f8:cmd,ctrl", function(frontwin) {
  // chain might be good for this, rotate through various tile regions
  slate.log("f8:cmd,ctrl");
  if(frontwin){
    leftHandSideTile(frontwin.app(), 0.8);
  }
});

slate.bind("f9:cmd", function(frontwin) {
  //Laptop screen only
  slate.log("configure laptop screen");
  // var scr  = slate.screen();
  laptopOnly(frontwin);
});

slate.bind("f10:cmd", function(frontwin) {
  //Laptop screen and monitor
  slate.log("configure laptop screen and monitor");
});

slate.bind("f11:cmd", function(frontwin) {
  // Restore snapshot 1
  restoreSnapshot('snapshot1');
});

slate.bind("f11:cmd,ctrl", function(frontwin) {
  // Take snapshot 1
  takeSnapshot('snapshot1');
});
// This doesn't work - it seems Slate can only have one snapshot, and the name
// doesn't matter.
slate.bind("f12:cmd", function(frontwin) {
  // Restore snapshot 2
  restoreSnapshot('fred');
});

slate.bind("f12:cmd,ctrl", function(frontwin) {
  // Take snapshot 2
  takeSnapshot('fred');
});

slate.default(2, function(){
  // default layout for 2 screens
  slate.log("2 screen default");
});

slate.default(1, function(){
  // default layout for single screen
  slate.log("1 screen default");
});
