/* For page initialization:

BOOTSTRAP.on_init will fill a documentFragment
BOOTSTRAP.on_measure happens after a paint - use this to measure elements without incurring extra reflows
BOOTSTRAP.on_draw happens after the measurement - please do not cause reflows.

*/

var User;
var Stations = [];

(function() {
	"use strict";
	var template;

	var initialize = function() {
		Prefs.define("pwr");
		if (Prefs.get("pwr")) {
			Sizing.simple = false;
		}

		// BOOTSTRAP.station_list = {
		// 	1: { "id": 1, "name": "Game", "url": "hello" },
		// 	2: { "id": 2, "name": "OC ReMix", "url": "hello" },
		// 	3: { "id": 3, "name": "Covers", "url": "hello" },
		// 	4: { "id": 4, "name": "Chiptune", "url": "hello" },
		// 	5: { "id": 5, "name": "All", "url": "hello" }
		// };
		// BOOTSTRAP.all_stations_info = {
		// 	1: { "album": "Game Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "Game Test Song" },
		// 	2: { "album": "OCR Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "OCR Test Song" },
		// 	3: { "album": "Covers Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "Covers Test Song" },
		// 	4: { "album": "Chip Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "Chip Test Song" },
		// 	5: { "album": "All Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "All Test Song" },
		// };

		var order = [ 5, 1, 4, 2, 3 ];
		var colors = {
			1: "#1f95e5",  // Rainwave blue
			2: "#de641b",  // OCR Orange
			3: "#b7000f",  // Red
			4: "#6e439d",  // Indigo
			5: "#a8cb2b",  // greenish
		};
		for (var i = 0; i < order.length; i++) {
			if (BOOTSTRAP.station_list[order[i]]) {
				Stations.push(BOOTSTRAP.station_list[order[i]]);
				Stations[Stations.length - 1].name = $l("station_name_" + order[i]);
				if (order[i] == BOOTSTRAP.user.sid) {
					Stations[Stations.length - 1].url = null;
				}
				if (colors[order[i]]) {
					Stations[Stations.length - 1].color = colors[order[i]];
				}
			}
		}

		if (window.location.href.indexOf("beta") !== -1) {
			for (i = 0; i < Stations.length; i++) {
				if (Stations[i].url) Stations[i].url += "/beta";
			}
		}
		BOOTSTRAP.station_list = Stations;

		template = RWTemplates.index({ "stations": Stations });
		User = BOOTSTRAP.user;
		API.add_callback("user", function(json) { User = json; });

		// pre-paint DOM operations while the network is doing its work for CSS
		for (i = 0; i < BOOTSTRAP.on_init.length; i++) {
			BOOTSTRAP.on_init[i](template);
		}
	// };

	// var draw = function() {
	// 	var i;
		if (User.id > 1) {
			document.body.classList.add("logged_in");
		}
		if (Prefs.get("pwr")) {
			document.body.classList.add("full");
			document.body.classList.remove("simple");
		}
		// Safari has CSS and font rendering issues :/
		var ua = navigator.userAgent.toLowerCase();
		if ((ua.indexOf("safari") !== -1) && (ua.indexOf("chrome") === -1)) {
			document.body.classList.add("safari");
		}

		document.body.appendChild(template._root);

		for (i = 0; i < BOOTSTRAP.on_measure.length; i++) {
			BOOTSTRAP.on_measure[i](template);
		}

		for (i = 0; i < BOOTSTRAP.on_draw.length; i++) {
			BOOTSTRAP.on_draw[i](template);
		}

		Sizing.trigger_resize();

		API.initialize(BOOTSTRAP.sid, "/api4/", BOOTSTRAP.user.id, BOOTSTRAP.user.api_key, BOOTSTRAP);

		if (document.ontouchstart === null) {
			var fastclick_load = document.createElement("script");
			fastclick_load.src = "//cdnjs.cloudflare.com/ajax/libs/fastclick/1.0.6/fastclick.min.js";
			fastclick_load.addEventListener("load", function() {
				FastClick.attach(document.body);
			});
			document.body.appendChild(fastclick_load);
		}

		Sizing.trigger_resize();

		if (!Router.detect_url_change()) {
			if (!Sizing.simple && docCookies.getItem("r5_list")) {
				Router.change(docCookies.getItem("r5_list"));
			}
			else if (Sizing.simple) {
				docCookies.removeItem("r5_list", "/", BOOTSTRAP.cookie_domain);
			}
		}

		document.body.classList.remove("loading");

		BOOTSTRAP = null;
	};

	//document.addEventListener("DOMContentLoaded", initialize);
	window.addEventListener("load", initialize);
}());
