// Base SQLite dans le navigateur (sql.js) présentée comme node:sqlite : prepare().get/all/run, exec.
// Ainsi, entrainement.js tourne tel quel sur le téléphone.
const LECTURE = /^\s*(SELECT|PRAGMA)\b/i;

// node:sqlite accepte undefined et les booléens ; sql.js veut null et des nombres
const lier = (params) => params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));

/** @param surEcriture appelée après chaque modification (pour sauvegarder la base dans le téléphone) */
export function envelopper(sqlDb, surEcriture) {
  function prepare(sql) {
    const ecriture = !LECTURE.test(sql);
    const executer = (params, f) => {
      const st = sqlDb.prepare(sql);
      try {
        st.bind(lier(params));
        return f(st);
      } finally {
        st.free();
      }
    };
    return {
      get: (...p) => executer(p, (st) => (st.step() ? st.getAsObject() : undefined)),
      all: (...p) => executer(p, (st) => {
        const lignes = [];
        while (st.step()) lignes.push(st.getAsObject());
        return lignes;
      }),
      run: (...p) => {
        sqlDb.run(sql, lier(p));
        const changes = sqlDb.getRowsModified();
        const lastInsertRowid = sqlDb.exec('SELECT last_insert_rowid()')[0].values[0][0];
        if (ecriture) surEcriture();
        return { changes, lastInsertRowid };
      },
    };
  }
  return {
    prepare,
    exec: (sql) => { sqlDb.exec(sql); surEcriture(); },
    close: () => {},
  };
}
