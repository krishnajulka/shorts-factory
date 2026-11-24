/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// 3D (three.js) lower screens need WebGL: ANGLE on a PC, software WebGL on the
// GPU-less cloud machine.
Config.setChromiumOpenGlRenderer(process.platform === "win32" ? "angle" : "swangle");
