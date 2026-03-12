export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_cmVuZXdlZC1kaW5nby00MC5jbGVyay5hY2NvdW50cy5kZXYk";

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);
