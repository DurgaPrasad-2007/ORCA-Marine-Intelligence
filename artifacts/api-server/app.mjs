// Vercel entrypoint for the api-server service.
// Vercel checks that this file exists before it runs the buildCommand, and dist/ is only created by that command
// (`node build.mjs`), so the entrypoint must be a committed file. It re-exports the pre-bundled Express app.
import "express"; // marks this as an Express entrypoint; the real app is in the bundle below
export { default } from "./dist/app.mjs";
