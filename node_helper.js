"use strict";

/* Magic Mirror
 * Module: MMM-BME280
 *
 * By Andrew Witwicki
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const exec = require("child_process").exec;
const https = require("https");
var mqtt = require("mqtt");

module.exports = NodeHelper.create({
  start: function () {
    console.log("BME280 helper started ...");
  },

  // Subclass socketNotificationReceived received.
  socketNotificationReceived: function (notification, payload) {
    const self = this;
    if (notification === "REQUEST") {
      const self = this;
      this.config = payload;
      var deviceAddr = this.config.deviceAddress;
      var iotplotter_feed = this.config.iotplotter_feed;
      var iotplotter_api_key = this.config.iotplotter_api_key;

      if (this.mqttClient === undefined && this.config.mqtt_broker) {
        // console.log("Init MQTT");
        this.mqttClient = mqtt.connect(
          this.config.mqtt_broker,
          this.config.mqtt_broker_options
        );
      }

      // execute external DHT Script
      exec(
        `python3 ./modules/MMM-BME280/bme280.py ${deviceAddr}`,
        (error, stdout) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          var arr = stdout.split(" ");
          arr[2] = String(Number(arr[2]) + this.config.pressureOffset);
          // Send data
          self.sendSocketNotification("DATA", {
            temp: arr[0],
            humidity: arr[1],
            press: arr[2]
          });

          // Send data to MQTT Broker
          if (this.mqttClient) {
            // console.log("Sending MQTT Messages");
            this.mqttClient.publish(
              this.config.mqtt_topic_base + "/temperature",
              arr[0]
            );
            this.mqttClient.publish(
              this.config.mqtt_topic_base + "/humidity",
              arr[1]
            );
            this.mqttClient.publish(
              this.config.mqtt_topic_base + "/barometer",
              arr[2]
            );
          }

          // Send data to iotplotter
          if (iotplotter_feed != null && iotplotter_api_key != null) {
            const data = JSON.stringify({
              data: {
                temperature: [
                  {
                    value: arr[0]
                  }
                ],
                humidity: [
                  {
                    value: arr[1]
                  }
                ],
                barometer: [
                  {
                    value: arr[2]
                  }
                ]
              }
            });

            const options = {
              hostname: "iotplotter.com",
              port: 443,
              path: `/api/v2/feed/${iotplotter_feed}`,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Content-Length": data.length,
                "api-key": iotplotter_api_key
              }
            };

            const req = https.request(options, (res) => {
              console.log(`statusCode: ${res.statusCode}`);

              res.on("data", (d) => {
                process.stdout.write(d);
              });
            });

            req.on("error", (error) => {
              console.error(error);
            });

            req.write(data);
            req.end();
          }
        }
      );
    }
  }
});
