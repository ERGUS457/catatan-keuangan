import { neon } from "@neondatabase/serverless";

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: async <T = any>(text: string, params: unknown[] = []): Promise<T[]> => {
      // sql.query returns a Promise of rows array
      const result = await sql.query(text, params);
      return result as unknown as T[];
    },
    raw: sql,
  };
}
