import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanGarbage() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fId = 'ae4992e1-33ba-47b1-9bea-d0bcec2ffd31';
    const pId = '0af19b5c-c8f5-4f32-8c35-4509807277b0';

    const cands = (await client.query('SELECT id FROM candidates WHERE election_fief_id = $1', [fId])).rows.map(r => r.id);
    if (cands.length) {
      await client.query('DELETE FROM candidate_reviews WHERE candidate_id = ANY($1)', [cands]);
    }
    await client.query('DELETE FROM candidates WHERE election_fief_id = $1', [fId]);

    const mats = (await client.query('SELECT id FROM materials WHERE election_fief_id = $1', [fId])).rows.map(r => r.id);
    if (mats.length) {
      await client.query('DELETE FROM material_files WHERE material_id = ANY($1)', [mats]);
    }
    await client.query('DELETE FROM materials WHERE election_fief_id = $1', [fId]);

    const anns = (await client.query('SELECT id FROM announcements WHERE election_fief_id = $1', [fId])).rows.map(r => r.id);
    if (anns.length) {
      await client.query('DELETE FROM announcement_files WHERE announcement_id = ANY($1)', [anns]);
    }
    await client.query('DELETE FROM announcements WHERE election_fief_id = $1', [fId]);

    const pos = (await client.query('SELECT id FROM positions WHERE election_fief_id = $1', [fId])).rows.map(r => r.id);
    if (pos.length) {
      await client.query('DELETE FROM position_files WHERE position_id = ANY($1)', [pos]);
    }
    await client.query('DELETE FROM positions WHERE election_fief_id = $1', [fId]);

    await client.query('DELETE FROM election_fief_stages WHERE election_fief_id = $1', [fId]);
    await client.query('DELETE FROM election_fiefs WHERE id = $1', [fId]);

    await client.query('DELETE FROM proposal_files WHERE proposal_id = $1', [pId]);
    await client.query('DELETE FROM election_proposals WHERE id = $1', [pId]);

    await client.query('COMMIT');
    console.log('Successfully cleaned garbage data!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Clean error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanGarbage();
