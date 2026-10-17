import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
let db: PGlite
const user = "00000000-0000-0000-0000-000000000001"
const other = "00000000-0000-0000-0000-000000000002"
const owned = "00000000-0000-0000-0000-000000000011"
const publicPlan = "00000000-0000-0000-0000-000000000012"
const privatePlan = "00000000-0000-0000-0000-000000000013"
const exercise = "00000000-0000-0000-0000-000000000021"
const otherExercise = "00000000-0000-0000-0000-000000000022"
const ownRow = "00000000-0000-0000-0000-000000000031"
const otherRow = "00000000-0000-0000-0000-000000000032"
const privateRow = "00000000-0000-0000-0000-000000000033"
const session = "00000000-0000-0000-0000-000000000041"
const otherSession = "00000000-0000-0000-0000-000000000042"
const migration = readFileSync("scripts/04-supabase-workout-integrity.sql", "utf8")
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE authenticated NOINHERIT NOBYPASSRLS;
    CREATE ROLE anon NOINHERIT NOBYPASSRLS;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `)
  await db.exec(readFileSync("scripts/01-create-tables.sql", "utf8"))
  await db.exec(migration)
  await db.exec(migration)
  await db.exec("GRANT USAGE ON SCHEMA public, auth TO authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated")
}, 30000)
afterAll(async () => { await db?.close() })
beforeEach(async () => {
  await db.exec("RESET ROLE; TRUNCATE auth.users, exercises CASCADE")
  await db.query("INSERT INTO auth.users(id,email) VALUES ($1,'a@example.com'),($2,'b@example.com')", [user, other])
  await db.query("INSERT INTO exercises(id,name) VALUES ($1,'Squat'),($2,'Lunge')", [exercise, otherExercise])
  await db.query("INSERT INTO workout_plans(id,name,created_by,is_public) VALUES ($1,'Owned',$2,false),($3,'Public',$4,true),($5,'Private',$4,false)", [owned, user, publicPlan, other, privatePlan])
  await db.query("INSERT INTO workout_plan_exercises(id,workout_plan_id,exercise_id,day_number) VALUES ($1,$2,$3,1),($4,$5,$3,1),($6,$7,$3,1)", [ownRow, owned, exercise, otherRow, publicPlan, privateRow, privatePlan])
  await db.query("INSERT INTO workout_sessions(id,user_id,workout_plan_id) VALUES ($1,$2,$3),($4,$5,$6)", [session, user, owned, otherSession, other, publicPlan])
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user])
  await db.exec("SET ROLE authenticated")
})

describe("Supabase permissions and atomic program creation", () => {
  it("reads owned and public planned exercises while hiding another user's private plan", async () => {
    const ids = (await db.query<{id: string}>("SELECT id FROM workout_plan_exercises ORDER BY id")).rows.map((row) => row.id)
    expect(ids).toEqual([ownRow, otherRow])
  })

  it("blocks insert, update and delete against another user's public plan exercises", async () => {
    await expect(db.query("INSERT INTO workout_plan_exercises(workout_plan_id,exercise_id,day_number) VALUES ($1,$2,1)", [publicPlan, otherExercise])).rejects.toThrow(/row-level security/i)
    expect((await db.query("UPDATE workout_plan_exercises SET reps='999' WHERE id=$1 RETURNING id", [otherRow])).rows).toEqual([])
    expect((await db.query("DELETE FROM workout_plan_exercises WHERE id=$1 RETURNING id", [otherRow])).rows).toEqual([])
  })

  it("allows owned exercise changes and owner-qualified program deletion", async () => {
    expect((await db.query("UPDATE workout_plan_exercises SET reps='10' WHERE id=$1 RETURNING id", [ownRow])).rows).toHaveLength(1)
    expect((await db.query("DELETE FROM workout_plans WHERE id=$1 RETURNING id", [publicPlan])).rows).toEqual([])
    expect((await db.query("DELETE FROM workout_plans WHERE id=$1 RETURNING id", [owned])).rows).toHaveLength(1)
    expect((await db.query("SELECT id FROM workout_plan_exercises WHERE id=$1", [ownRow])).rows).toEqual([])
  })

  it("creates the program and ordered exercises together", async () => {
    const result = await db.query<{id: string; created_by: string}>("SELECT * FROM create_training_program($1,$2,$3::uuid[])", [" New plan ", "Description", [otherExercise, exercise]])
    expect(result.rows[0].created_by).toBe(user)
    const linked = (await db.query<{exercise_id: string}>("SELECT exercise_id FROM workout_plan_exercises WHERE workout_plan_id=$1 ORDER BY order_in_day", [result.rows[0].id])).rows
    expect(linked.map((row) => row.exercise_id)).toEqual([otherExercise, exercise])
  })

  it("rolls back the plan when inserting its exercises fails", async () => {
    await db.exec("RESET ROLE; CREATE FUNCTION reject_test_exercise() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected insert failure'; END; $$; CREATE TRIGGER reject_test_exercise BEFORE INSERT ON workout_plan_exercises FOR EACH ROW EXECUTE FUNCTION reject_test_exercise(); SET ROLE authenticated")
    try {
      await expect(db.query("SELECT * FROM create_training_program($1,$2,$3::uuid[])", ["Must roll back", "", [exercise]])).rejects.toThrow("Injected insert failure")
      expect((await db.query("SELECT id FROM workout_plans WHERE name='Must roll back'")).rows).toEqual([])
    } finally { await db.exec("RESET ROLE; DROP TRIGGER reject_test_exercise ON workout_plan_exercises; DROP FUNCTION reject_test_exercise()") }
  })

  it("rejects empty, duplicate and unknown exercise lists without creating a plan", async () => {
    for (const ids of [[], [exercise, exercise], ["00000000-0000-0000-0000-000000000099"]]) {
      await expect(db.query("SELECT * FROM create_training_program($1,$2,$3::uuid[])", ["Invalid", "", ids])).rejects.toThrow()
    }
    expect((await db.query("SELECT id FROM workout_plans WHERE name='Invalid'")).rows).toEqual([])
  })

  it("accepts only the correct planned exercise in an owned active session", async () => {
    await expect(db.query("INSERT INTO exercise_logs(session_id,exercise_id,workout_plan_exercise_id) VALUES ($1,$2,$3)", [session, exercise, otherRow])).rejects.toThrow(/row-level security/i)
    await expect(db.query("INSERT INTO exercise_logs(session_id,exercise_id,workout_plan_exercise_id) VALUES ($1,$2,$3)", [otherSession, exercise, otherRow])).rejects.toThrow(/row-level security/i)
    await expect(db.query("INSERT INTO exercise_logs(session_id,exercise_id,workout_plan_exercise_id) VALUES ($1,$2,$3)", [session, otherExercise, ownRow])).rejects.toThrow(/row-level security/i)
    expect((await db.query("INSERT INTO exercise_logs(session_id,exercise_id,workout_plan_exercise_id) VALUES ($1,$2,$3) RETURNING id", [session, exercise, ownRow])).rows).toHaveLength(1)
    await expect(db.query("INSERT INTO exercise_logs(session_id,exercise_id,workout_plan_exercise_id) VALUES ($1,$2,$3)", [session, exercise, ownRow])).rejects.toThrow(/unique constraint/i)
  })

  it("rejects writing logs after the workout is completed", async () => {
    await db.query("UPDATE workout_sessions SET completed_at=NOW() WHERE id=$1", [session])
    await expect(db.query("INSERT INTO exercise_logs(session_id,exercise_id,workout_plan_exercise_id) VALUES ($1,$2,$3)", [session, exercise, ownRow])).rejects.toThrow(/row-level security/i)
  })
})
