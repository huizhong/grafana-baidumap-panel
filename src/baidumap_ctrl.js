/* eslint import/no-extraneous-dependencies: 0 */
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import TimeSeries from 'app/core/time_series2';
import kbn from 'app/core/utils/kbn';

import _ from 'lodash';
import mapRenderer from './map_renderer';
import DataFormatter from './data_formatter';
import { MP } from "./libs/baidumap.js";  
import $ from 'jquery'

const panelDefaults = {
  ak: "4AWvSkHwSEcX8nwS0bZBcFZTDw70NzZZ",
  maxDataPoints: 1,
  theme: "normal",
  lat: 39.915,
  lng: 116.404,
  initialZoom: 11,
  valueName: "current",
  locationData: "table",
  icon: "Label",
  esMetric: "Count",
  decimals: 0,
  navigation: true,
  scale: true,
  hideEmpty: false,
  overviewMap: false,
  hideZero: false,
  mapType: true
};

export default class BaidumapCtrl extends MetricsPanelCtrl {
  constructor($scope, $injector, contextSrv) {
    super($scope, $injector);
    this.setMapProvider(contextSrv);
    _.defaults(this.panel, panelDefaults);
    this.dataFormatter = new DataFormatter(this, kbn);
    this.markers = [];
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('panel-teardown', this.onPanelTeardown.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));
    //this.loadLocationDataFromFile();
  }

  setMapProvider(contextSrv) {
//    this.tileServer = contextSrv.user.lightTheme ? 'CartoDB Positron' : 'CartoDB Dark';
    this.tileServer = 'CartoDB Positron';
    this.setMapSaturationClass();
  }

  setMapSaturationClass() {
    if (this.tileServer === 'CartoDB Dark') {
      this.saturationClass = 'map-darken';
    } else {
      this.saturationClass = '';
    }
  }

  loadLocationDataFromFile(reload) {
    if (this.map && !reload) return;

    if (this.panel.snapshotLocationData) {
      this.locations = this.panel.snapshotLocationData;
      return;
    }

    if (this.panel.locationData === "jsonp endpoint") {

    } else if (this.panel.locationData === "json endpoint") {
      if (!this.panel.jsonUrl) return;

    } else if (this.panel.locationData === "table") {
      // .. Do nothing

    } else if (this.panel.locationData !== "geohash" && this.panel.locationData !== "json result") {

    }
  }

  reloadLocations(res) {
    this.locations = res;
    this.refresh();
  }

  onPanelTeardown() {
    if (this.map) delete this.map;
  }

  onInitEditMode() {
    this.addEditorTab('Baidumap', 'public/plugins/grafana-baidumap-panel/partials/editor.html', 2);
  }

  onDataReceived(dataList) {
    if (!dataList) return;
    if (this.dashboard.snapshot && this.locations) {
      this.panel.snapshotLocationData = this.locations;
    }
    const data = [];
    if (this.panel.locationData === "geohash") {
      this.dataFormatter.setGeohashValues(dataList, data);
    } else if (this.panel.locationData === "table") {
      const tableData = dataList.map(DataFormatter.tableHandler.bind(this));
      this.dataFormatter.setTableValues(tableData, data);
    } else if (this.panel.locationData === "json result") {
      this.series = dataList;
      this.dataFormatter.setJsonValues(data);
    } else {
      const tableData = dataList.map(DataFormatter.tableHandler.bind(this));
      this.dataFormatter.setTableValues(tableData, data);
    }
    //const datas = this.filterEmptyAndZeroValues(data);
    const datas = data;
    if(typeof this.data === 'object')this.data.splice(0, this.data.length);
    this.markers.splice(0, this.markers.length);
    if (datas.length) {
      this.data = datas;
      
      if (this.map) {
        this.addNode(this.BMap);
      } else {
        this.render();
      }
    } else {
      if(this.map)this.map.clearOverlays();
      this.render();
    }
  }
  
  addMarker(point, BMap, data) {
    const myIcon = new BMap.Icon("public/plugins/grafana-baidumap-panel/images/pins6-poi.png", new BMap.Size(30, 30));
    const marker = new BMap.Marker(point, { icon: myIcon });
    
    this.markers.push(marker);
    if(this.markers.length == this.data.length){
      const markerClusterer = new BMapLib.MarkerClusterer(this.map, {
        markers: this.markers
      });
    }
    //this.map.setViewport(pointArray);
    marker.enableDragging();
    let scontent = "";
    scontent += '<a href=""><div class="infobox" id="infobox"><div class="infobox-content" style="display:block">';
    scontent += '<div class="infobox-header"><div class="infobox-header-icon"><img src="public/plugins/grafana-baidumap-panel/images/pins6.png"></div>';
    scontent += '<div class="infobox-header-name"><p>'+data.nodeid+'</p></div>';
    scontent += '<div class="infobox-header-type" style="min-width:250px"><p>'+data.type+'</p></div></div>';
    scontent += '<div class="infobox-footer">在线时间：10分钟前</div>';
    scontent += '<div class="infobox-footer-right"></div></div><div class="arrow"></div></div></a>';

    const infoWindow = new BMap.InfoWindow(scontent); // 创建信息窗口对象
    marker.addEventListener("click", function() {
      this.map.openInfoWindow(infoWindow, point); //开启信息窗口
    });

    this.map.addOverlay(marker);
    marker.addEventListener("dragend", function(e) {
      point = new BMap.Point(e.point.lng, e.point.lat);
      alert("当前位置：" + e.point.lng + ", " + e.point.lat);
    });
  }

  addNode(BMap) {    
    const list = this.data;
    this.map.clearOverlays();
    console.log(list);
    if(list){
      const fport = this.data[0].fport;
      const lineArray = [];
      const heatArray = [];
      
      for (const i in list) {
        if (list[i].lng > 0 && list[i].lat > 0) {
          const url = "http://api.map.baidu.com/geoconv/v1/?coords=" + list[i].lng + "," + list[i].lat + "&from=1&to=5&ak=" + this.panel.ak + "&callback=?";
          $.getJSON(url, function (e) {
            const result = e.result[0];
            const linePoint = new BMap.Point(result.x, result.y);
            const heatPoint = { lng: result.x, lat: result.y, count: list[i].rssi };
            lineArray.push(linePoint);
            heatArray.push(heatPoint);
          });
        }
      }
      
      setTimeout(() => {
        if(fport == "5"){
          //热力图
          if (!isSupportCanvas()) {
            alert("热力图目前只支持有canvas支持的浏览器,您所使用的浏览器不能使用热力图功能~");
          }
          var heatmapOverlay = new BMapLib.HeatmapOverlay({ radius: 20 });
          this.map.addOverlay(heatmapOverlay);
          heatmapOverlay.setDataSet({ data: heatArray, max: 100 });

          function setGradient() {
            var gradient = {};
            var colors = document.querySelectorAll("input[type='color']");
            colors = [].slice.call(colors, 0);
            colors.forEach(function (ele) {
              gradient[ele.getAttribute("data-key")] = ele.value;
            });
            heatmapOverlay.setOptions({ gradient: gradient });
          }
          //判断浏览区是否支持canvas
          function isSupportCanvas() {
            var elem = document.createElement("canvas");
            return !!(elem.getContext && elem.getContext("2d"));
          }
        }else if(fport == "33"){
          var polyline = new BMap.Polyline(lineArray, {
            enableEditing: false, //是否启用线编辑，默认为false
            enableClicking: true, //是否响应点击事件，默认为true
            strokeWeight: "4", //折线的宽度，以像素为单位
            strokeOpacity: 0.5, //折线的透明度，取值范围0 - 1
            strokeColor: "blue" //折线颜色
          });
          this.map.addOverlay(polyline); //增加折线
        }else{
            const pointArray = [];
            for (const i in list) {
              const point = new BMap.Point(list[i].lng, list[i].lat);
              this.addMarker(point, BMap, list[i]);
            }
        }
      }, 500);
    }
  }

  filterEmptyAndZeroValues(data) {
		return _.filter(data, (o) => {
			return !(this.panel.hideEmpty && _.isNil(o.value)) && !(this.panel.hideZero && o.value === 0);
		});
	}

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData);
  }

  seriesHandler(seriesData) {
    const series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });
    
    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }
  
  setNewMapCenter() {
    this.render();
  }

  setZoom() {
    this.map.setZoom(parseInt(this.panel.initialZoom, 10) || 1);
  }

  setStyle() {
		this.map.setMapStyle({ style: this.panel.theme });
	}

  setAK() {
    let x = document.body;
    let s = document.getElementsByTagName("script");
    let len = s.length;
    x.removeChild(s[len - 1]);
    delete this.map;
    this.render();
	}

  navigationControl() {
    if (this.panel.navigation == true) {
      this.map.addControl(this.navigationSwitch);
    } else {
      this.map.removeControl(this.navigationSwitch);
    }
  }

  scaleControl() {
    if (this.panel.scale == true) {
      this.map.addControl(this.scaleSwitch);
    } else {
      this.map.removeControl(this.scaleSwitch);
    }
  }

  overviewMapControl() {
    if (this.panel.overviewMap == true) {
      this.map.addControl(this.overviewMapSwitch);
    } else {
      this.map.removeControl(this.overviewMapSwitch);
    }
  }

  mapTypeControl() {
    if (this.panel.mapType == true) {
      this.map.addControl(this.mapTypeSwitch);
    } else {
      this.map.removeControl(this.mapTypeSwitch);
    }
  }

  resize() {
    
  }

  toggleStickyLabels() {
    console.log(this.panel.stickyLabels);
  }

  changeLocationData() {
    if (this.panel.locationData === 'geohash') {
      this.render();
    }
  }

/* eslint class-methods-use-this: 0 */
  link(scope, elem, attrs, ctrl) {
    mapRenderer(scope, elem, attrs, ctrl);
  }
}

BaidumapCtrl.templateUrl = 'module.html';
