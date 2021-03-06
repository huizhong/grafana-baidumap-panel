function loadJsFile(fileName, reject = null) {
    const fileElement = document.createElement('script');
    fileElement.setAttribute('type', 'text/javascript');
    fileElement.setAttribute('src', fileName);
    if (reject) {
        fileElement.onerror = reject;
    }
    document.head.appendChild(fileElement);
}

function loadCssFile(fileName, reject = null) {
    const fileElement = document.createElement('link');
    fileElement.setAttribute('rel', 'stylesheet');
    fileElement.setAttribute('type', 'text/css');
    fileElement.setAttribute('href', fileName);
    if (reject) {
        fileElement.onerror = reject;
    }
    document.head.appendChild(fileElement);
}

function waitLoading(checkFun, runFun, checkTime, maxTime, delayTime) {
    if (checkFun() && maxTime > checkTime) {
        setTimeout(runFun(), delayTime);
        runFun();
    } else {
        setTimeout(() => waitLoading(checkFun, runFun, checkTime, maxTime - checkTime, delayTime), checkTime);
    }
}

export function MP(ak) {
    return new Promise((resolve, reject) => {
        loadJsFile('https://api.map.baidu.com/api?v=3.0&ak=' + ak + '&callback=init', reject);
        waitLoading(() => (typeof (BMap) !== 'undefined' && typeof (BMap.Map) !== 'undefined'), () => {
            loadJsFile('https://api.map.baidu.com/library/TextIconOverlay/1.2/src/TextIconOverlay_min.js', reject);
            loadJsFile('https://api.map.baidu.com/library/MarkerClusterer/1.2/src/MarkerClusterer_min.js', reject);
            loadJsFile('https://api.map.baidu.com/library/Heatmap/2.0/src/Heatmap_min.js', reject);
            loadJsFile('https://api.map.baidu.com/library/DistanceTool/1.2/src/DistanceTool_min.js', reject);
            loadJsFile('https://api.map.baidu.com/library/RectangleZoom/1.2/src/RectangleZoom_min.js', reject);

            loadJsFile('https://api.map.baidu.com/library/TrafficControl/1.4/src/TrafficControl_min.js', reject);
            loadCssFile('https://api.map.baidu.com/library/TrafficControl/1.4/src/TrafficControl_min.css', reject);
            waitLoading(() => (typeof (BMapLib) !== 'undefined')
                && (typeof (BMapLib.HeatmapOverlay) !== 'undefined')
                && (typeof (BMapLib.MarkerClusterer) !== 'undefined')
                && (typeof (BMapLib.DistanceTool) !== 'undefined')
                && (typeof (BMapLib.RectangleZoom) !== 'undefined')
                && (typeof (BMapLib.TrafficControl) !== 'undefined')
                , () => {
                    resolve(BMap);
                }, 100, 60000, 500);
        }, 100, 60000, 500);
    });
}
