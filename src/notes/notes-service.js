const NotesService = {
    getAllNotes(knex) {
        return knex
            .select('*')
            .from('noteful_notes')     
    },
    getNoteById(knex, id) {
        return knex
            .select('*')
            .from('noteful_notes')
            .where('id', id)
            .first()
    },
    insertNote(knex, newNote) {
        return knex
            .insert(newNote)
            .into('noteful_notes')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    deleteNote(knex, id) {
        return knex('noteful_notes')
            .where({ id })
            .delete()
    },
    patchNote(knex, id, updatedNote) {
        return knex('noteful_notes')
            .where({ id })
            .update(updatedNote)
    }
}

module.exports = NotesService