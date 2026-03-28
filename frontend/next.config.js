const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Keep the app root at the frontend package (where Next is installed).
    root: __dirname,
  },
};

module.exports = nextConfig;
