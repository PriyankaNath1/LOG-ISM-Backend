import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    adapter: "postgresql",
    url: process.env.DATABASE_URL!,
  },
});