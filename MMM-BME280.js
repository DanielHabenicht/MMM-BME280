Module.register("MMM-BME280", {
  // Default module config.
  defaults: {
    updateInterval: 100, // Seconds
    titleText: "Home weather",
    deviceAddress: "0x76",
    temperatureScaleType: 0, // Celsuis
    pressureScaleType: 0, // hPa
    pressureOffset: 0,
    size: "medium", // You can use any official classes: https://forum.magicmirror.builders/topic/346/resize-custom-or-main-modules
    displayOptions: {
        temperature: true,
        humidity: true,
        pressure: true,
    },
  },

  // Define start sequence.
  start: function () {
    Log.info("Starting module: " + this.name);

    this.temperature = "Loading...";
    this.humidity = "Loading...";
    this.pressure = "Loading...";

    this.update();
    if(this.config.updateInterval > 0){
        setInterval(this.update.bind(this), this.config.updateInterval * 1000);
    }
  },

  update: function () {
    this.sendSocketNotification("REQUEST", this.config);
  },

  getStyles: function () {
    return ["MMM-BME280.css"];
  },

  // Override dom generator.
  getDom: function () {
    var wrapper = document.createElement("div");

    var table = document.createElement("table");
    table.className = this.config.size;
    var tbody = document.createElement("tbody");
    for (let option of Object.keys(this.config.displayOptions)) {
      var val = "";
      var sufix = "";
      var icon_img = "";

      switch (option) {
        case "temperature":
          switch (this.config.temperatureScaleType) {
            case 0: // Celsius
              val = this.temperature;
              sufix = "°C";
              break;
            case 1: // Fahrenheit
              val = Math.round((this.temperature * 9.0) / 5.0 + 32.0);
              sufix = "°F";
              break;
          }
          icon_img = "temperature-high";
          break;
        case "humidity":
          val = this.humidity;
          icon_img = "tint";
          sufix = "%";
          break;
        case "pressure":
          switch (this.config.pressureScaleType) {
            case 0: // hPa
              val = this.pressure;
              sufix = " hPa";
              break;
            case 1: // inHg
              val = Math.round((this.pressure * 100) / 33.864) / 100;
              sufix = " inHg";
              break;
          }
          icon_img = "tachometer-alt";
          break;
      }

      if(this.config.displayOptions[option]){
          var tr = document.createElement("tr");
          var icon = document.createElement("i");
          
          icon.className = `fa fa-${icon_img} bme-icon  ${this.config.size}`;
          
          var text = document.createTextNode(" " + val + sufix);

          var td = document.createElement("td");
          td.className = "bme-td-icon";
          td.appendChild(icon);
          tr.appendChild(td);

          var texttd = document.createElement("td");
          texttd.className = `bme-text ${this.config.size}`;
          texttd.appendChild(text);
          tr.appendChild(texttd);
          
          tbody.appendChild(tr);
        }
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "DATA") {
      this.temperature = payload.temp;
      this.humidity = payload.humidity;
      this.pressure = payload.press;
      this.updateDom();
    }
  }
});
