const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

notesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
            .then(notes => {
                res.json(notes)
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { note_name, modified, folder_id, content } = req.body
        const newNote = { note_name, modified, folder_id, content }

        for (let [key, value] of Object.entries(newNote)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body`}
                })
            }
        }

        NotesService.insertNote(
            req.app.get('db'),
            newNote
        )
        .then(note => {
            res
                .status(201)
                .location(`/api/notes/${note.id}`)
                .json(note)
        })
        .catch(next)
    })

notesRouter
    .route('/:note_id')
    .all((req, res, next) =>{
        const knexInstance = req.app.get('db')
        const id = req.params.note_id
        NotesService.getNoteById(knexInstance, id)
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: { message: 'Note does not exist' }
                    })
                }
                res.note = note
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.status(200).json(res.note)
    })
    .delete((req, res, next) => {
        NotesService.deleteNote(
            req.app.get('db'),
            req.params.note_id
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { note_name, content } = req.body 
        const noteUpdate = { note_name, content }
        
        const numberOfVals = Object.values(noteUpdate).filter(Boolean).length
        if (numberOfVals === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body needs a valid value`
                }
            })
        }

        NotesService.patchNote(
            req.app.get('db'),
            req.params.note_id,
            noteUpdate
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })


module.exports = notesRouter