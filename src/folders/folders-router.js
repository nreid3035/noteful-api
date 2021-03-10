const path = require('path')
const express = require('express')
const xss = require('xss')
const FoldersService = require('./folders-service')
const NotesService = require('../notes/notes-service')

const foldersRouter = express.Router()
const jsonParser = express.json()

foldersRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FoldersService.getAllFolders(knexInstance)
            .then(folders => {
                res.json(folders)
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { folder_name } = req.body
        const newFolder = { folder_name }

        if (!newFolder.folder_name) {
            res.status(400).json({
                error: { message: 'Invalid folder name' }
            })
        }

        FoldersService.insertFolder(
            req.app.get('db'),
            newFolder
        )
        .then(folder => {
            res
                .status(201)
                .location(path.posix.join(req.originalUrl + `/${folder.id}`))
                .json(folder)
        })
        .catch(next)
    })

foldersRouter
    .route('/:folder_id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db')
        const id = req.params.folder_id
        FoldersService.getFolderById(knexInstance, id)
            .then(folder => {
                if (!folder) {
                    return res.status(404).json({
                        error: { message: 'Folder does not exist' }
                    })
                }
                res.folder = folder
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.status(200).json(res.folder)
    })
    .delete((req, res, next) => {
        FoldersService.deleteFolder(
            req.app.get('db'),
            req.params.folder_id
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { folder_name } = req.body
        const updatedFolder = { folder_name }

        const numberOfVals = Object.values(updatedFolder).filter(Boolean).length
        if (numberOfVals === 0) {
            return res.status(400).json({
                error: { message: 'Request body needs a valid value'}
            })
        }

        FoldersService.patchFolder(
            req.app.get('db'),
            req.params.folder_id,
            updatedFolder
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })

module.exports = foldersRouter