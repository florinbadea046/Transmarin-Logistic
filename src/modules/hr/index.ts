// Barrel pentru modulul HR — expune tipurile + pagina overview ca default.
// Paginile individuale raman la `@/modules/hr/pages/*` (lazy-loaded din router).

export * from "./types";
export { default } from "./overview";
