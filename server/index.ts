import app from "./src/app";

console.log("hello world");

Bun.serve({
  fetch: app.fetch,
  port: process.env.PORT || 8080,
});
