import { Config } from "@remotion/cli/config";

// PNG = lossless кадры — текст чёткий без JPEG-артефактов
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
// CRF передаётся через --crf в CLI (см. picker-server.js → runRender)
